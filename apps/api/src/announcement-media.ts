import { BadRequestException, HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { config } from './config';

export type MediaProvider = 'local' | 's3';
export const mediaProvider = (): MediaProvider => config.ANNOUNCEMENT_MEDIA_PROVIDER ?? (config.NODE_ENV === 'production' ? 's3' : 'local');
const maxBytes = 5 * 1024 * 1024;
export const maxSchoolLogoBytes = 2 * 1024 * 1024;
export const maxSchoolLogoSvgBytes = 256 * 1024;
const maxSchoolLogoDimension = 2048;
const maxSchoolLogoPixels = maxSchoolLogoDimension * maxSchoolLogoDimension;
const maxSvgNestingDepth = 16;
const maxSvgElementCount = 500;
const signature = Buffer.from('89504e470d0a1a0a', 'hex');
const riffSignature = Buffer.from('52494646', 'hex');
const webpSignature = Buffer.from('57454250', 'hex');
sharp.concurrency(2);
sharp.cache({ memory: 32, files: 0, items: 32 });
let announcementProcessing = 0;
let schoolLogoProcessing = 0;
export const maxConcurrentAnnouncementProcessing = 2;
export const maxConcurrentSchoolLogoProcessing = 4;

const ALLOWED_SVG_ELEMENTS: ReadonlySet<string> = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'title',
  'desc',
  'text',
  'tspan',
]);

const ALLOWED_SVG_ATTRIBUTES: ReadonlySet<string> = new Set([
  'xmlns',
  'version',
  'viewBox',
  'width',
  'height',
  'preserveAspectRatio',
  'id',
  'd',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'fx',
  'fy',
  'clipPathUnits',
  'clip-path',
  'mask',
  'maskUnits',
  'maskContentUnits',
  'font-size',
  'font-weight',
  'font-family',
  'text-anchor',
  'dominant-baseline',
  'letter-spacing',
  'style',
  'display',
  'visibility',
  'color',
  'clip-rule',
  'vector-effect',
]);

const ALLOWED_SVG_STYLE_PROPS: ReadonlySet<string> = new Set([
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'stop-color',
  'stop-opacity',
  'display',
  'visibility',
  'color',
  'clip-rule',
]);

const UNSAFE_SVG_VALUE_PATTERN = /(?:javascript\s*:|vbscript\s*:|data\s*:|file\s*:|https?\s*:|\/\/|@import|expression\s*\(|-moz-binding|behavior\s*:|<!|<script|<foreignobject)/i;

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeAndValidateXmlEntities(raw: string, context: string): string {
  if (!raw.includes('&')) return raw;
  return raw.replace(/&([^;]*)(;?)/g, (_full, entityBody: string, semicolon: string) => {
    if (semicolon !== ';' || !entityBody) {
      throw new BadRequestException(`Malformed or unescaped '&' in SVG ${context}.`);
    }
    if (entityBody === 'amp') return '&';
    if (entityBody === 'lt') return '<';
    if (entityBody === 'gt') return '>';
    if (entityBody === 'quot') return '"';
    if (entityBody === 'apos') return "'";
    if (entityBody.startsWith('#')) {
      const isHex = entityBody.startsWith('#x') || entityBody.startsWith('#X');
      const digits = isHex ? entityBody.slice(2) : entityBody.slice(1);
      if (
        !digits ||
        (isHex ? !/^[0-9a-fA-F]{1,6}$/.test(digits) : !/^\d{1,7}$/.test(digits))
      ) {
        throw new BadRequestException(`Invalid numeric character reference "&${entityBody};" in SVG ${context}.`);
      }
      const codePoint = Number.parseInt(digits, isHex ? 16 : 10);
      if (
        !Number.isFinite(codePoint) ||
        codePoint > 0x10FFFF ||
        (codePoint >= 0xD800 && codePoint <= 0xDFFF) ||
        codePoint === 0x7F ||
        (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0A && codePoint !== 0x0D)
      ) {
        throw new BadRequestException(`Forbidden control or out-of-range character reference in SVG ${context}.`);
      }
      return String.fromCodePoint(codePoint);
    }
    throw new BadRequestException(`Unsupported XML entity "&${entityBody};" in SVG ${context}.`);
  });
}

function findTagEndQuoteAware(source: string, startAfterLt: number): number {
  let quote: '"' | "'" | null = null;
  for (let i = startAfterLt; i < source.length; i++) {
    const ch = source[i];
    if (quote !== null) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '<') {
        throw new BadRequestException('Unescaped "<" inside SVG attribute value.');
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '<') {
      throw new BadRequestException('Malformed nested "<" inside XML tag in SVG logo.');
    } else if (ch === '>') {
      return i;
    }
  }
  throw new BadRequestException('Unclosed XML tag or attribute quote in SVG logo.');
}

function validateSvgRootDimension(attrName: 'width' | 'height', rawValue: string): { sanitized: string; pixels: number | null } {
  const trimmed = rawValue.trim();
  const match = /^(\d+(?:\.\d+)?|\.\d+)(px|pt|pc|mm|cm|in|%)?$/i.exec(trimmed);
  if (!match) {
    throw new BadRequestException(`SVG root ${attrName} ("${rawValue}") must be a positive numeric dimension.`);
  }
  const numeric = Number.parseFloat(match[1]);
  const unit = (match[2] ?? 'px').toLowerCase();
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new BadRequestException(`SVG root ${attrName} must be greater than zero.`);
  }
  if (unit === '%') {
    if (numeric > 100) {
      throw new BadRequestException(`SVG root ${attrName} percentage must not exceed 100%.`);
    }
    return { sanitized: `${numeric}%`, pixels: null };
  }
  const unitMultipliers: Record<string, number> = {
    px: 1,
    pt: 96 / 72,
    pc: 16,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    in: 96,
  };
  const multiplier = unitMultipliers[unit];
  if (!multiplier) {
    throw new BadRequestException(`Unsupported SVG root ${attrName} unit "${unit}".`);
  }
  const effectivePixels = numeric * multiplier;
  if (!Number.isFinite(effectivePixels) || effectivePixels < 1 || effectivePixels > maxSchoolLogoDimension) {
    throw new BadRequestException(`SVG root ${attrName} ("${rawValue}") exceeds maximum allowed dimension of ${maxSchoolLogoDimension}px.`);
  }
  const normalizedPx = Math.round(effectivePixels * 100) / 100;
  return { sanitized: String(normalizedPx), pixels: normalizedPx };
}

function validateSvgViewBox(rawValue: string): string {
  const parts = rawValue.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 4 || !parts.every(part => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(part))) {
    throw new BadRequestException('SVG viewBox must contain four finite numbers (min-x min-y width height).');
  }
  const [minX, minY, vbWidth, vbHeight] = parts.map(Number);
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(vbWidth) ||
    !Number.isFinite(vbHeight) ||
    Math.abs(minX) > maxSchoolLogoDimension ||
    Math.abs(minY) > maxSchoolLogoDimension ||
    vbWidth <= 0 ||
    vbHeight <= 0 ||
    vbWidth > maxSchoolLogoDimension ||
    vbHeight > maxSchoolLogoDimension
  ) {
    throw new BadRequestException(`SVG viewBox dimensions must be positive and within ${maxSchoolLogoDimension} units.`);
  }
  return `${minX} ${minY} ${vbWidth} ${vbHeight}`;
}

function validateSvgStyleAttribute(rawStyle: string): string {
  if (UNSAFE_SVG_VALUE_PATTERN.test(rawStyle) || rawStyle.includes('/*') || rawStyle.includes('*/') || rawStyle.includes('\\')) {
    throw new BadRequestException('SVG style attribute contains disallowed CSS syntax or external references.');
  }
  const declarations = rawStyle
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);
  const sanitizedParts: string[] = [];
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx <= 0) {
      throw new BadRequestException('Malformed SVG style attribute declaration.');
    }
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!ALLOWED_SVG_STYLE_PROPS.has(prop)) {
      throw new BadRequestException(`Unsupported SVG style property "${prop}".`);
    }
    if (!val || /[:;{}<>\\]/.test(val) || UNSAFE_SVG_VALUE_PATTERN.test(val)) {
      throw new BadRequestException(`Unsafe value in SVG style property "${prop}".`);
    }
    if (/url\s*\(/i.test(val) && !/^url\(\s*#[A-Za-z0-9_-]{1,64}\s*\)$/.test(val)) {
      throw new BadRequestException('SVG style url() references must only target internal fragment IDs.');
    }
    sanitizedParts.push(`${prop}:${val}`);
  }
  return sanitizedParts.join(';');
}

function validateSvgAttributeValue(attrName: string, rawValue: string, isRootSvg = false): string {
  const decoded = decodeAndValidateXmlEntities(rawValue, `attribute "${attrName}"`);
  const value = decoded.trim();
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value) || value.includes('<')) {
    throw new BadRequestException(`SVG attribute "${attrName}" contains invalid characters.`);
  }
  if (attrName === 'xmlns') {
    if (value !== 'http://www.w3.org/2000/svg') {
      throw new BadRequestException('SVG xmlns must be "http://www.w3.org/2000/svg".');
    }
    return value;
  }
  if (UNSAFE_SVG_VALUE_PATTERN.test(value)) {
    throw new BadRequestException(`SVG attribute "${attrName}" contains a forbidden URL, protocol, or script expression.`);
  }
  if (isRootSvg && (attrName === 'width' || attrName === 'height')) {
    return validateSvgRootDimension(attrName, value).sanitized;
  }
  if (attrName === 'viewBox') {
    return validateSvgViewBox(value);
  }
  if (attrName === 'style') {
    return validateSvgStyleAttribute(value);
  }
  if (/url\s*\(/i.test(value) && !/^url\(\s*#[A-Za-z0-9_-]{1,64}\s*\)$/.test(value)) {
    throw new BadRequestException(`SVG attribute "${attrName}" may only use internal fragment url(#id) references.`);
  }
  if (attrName === 'id' && !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new BadRequestException('SVG id attribute must be 1 to 64 alphanumeric, hyphen, or underscore characters.');
  }
  return value;
}

export function sanitizeAndValidateSchoolLogoSvg(bytes: Buffer): string {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > maxSchoolLogoSvgBytes) {
    throw new BadRequestException('An SVG logo up to 256 KB is required.');
  }
  if (bytes.includes(0)) {
    throw new BadRequestException('SVG logo must be valid UTF-8 XML without null bytes.');
  }
  let raw = bytes.toString('utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(raw)) {
    throw new BadRequestException('SVG logo contains forbidden control characters.');
  }
  if (/<!DOCTYPE|<!ENTITY|<!ELEMENT|<!ATTLIST|<\?xml-stylesheet|<!\[CDATA\[/i.test(raw)) {
    throw new BadRequestException('SVG logo must not contain DOCTYPE, ENTITY declarations, CDATA sections, or XML stylesheets.');
  }

  let cursor = raw.trim();
  if (cursor.startsWith('<?xml')) {
    const endPi = cursor.indexOf('?>');
    if (endPi < 0) {
      throw new BadRequestException('Malformed XML declaration in SVG logo.');
    }
    const decl = cursor.slice(0, endPi + 2);
    if (!/^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["'](?:UTF-8|utf-8)["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>$/.test(decl)) {
      throw new BadRequestException('Unsupported XML declaration in SVG logo.');
    }
    cursor = cursor.slice(endPi + 2).trim();
  }

  // Strip safe XML comments while rejecting nested or malformed comment markers
  cursor = cursor.replace(/<!--([\s\S]*?)-->/g, (_match, content: string) => {
    if (content.includes('--') || /<!|<script/i.test(content)) {
      throw new BadRequestException('Invalid XML comment in SVG logo.');
    }
    return '';
  }).trim();

  if (cursor.includes('<?') || cursor.includes('<!')) {
    throw new BadRequestException('SVG logo contains unsupported XML declarations or processing instructions.');
  }
  if (!cursor.startsWith('<svg') || (!cursor.endsWith('</svg>') && !cursor.endsWith('/>'))) {
    throw new BadRequestException('SVG logo must have a single root <svg> element.');
  }

  interface SvgAstNode {
    tag: string;
    attrs: Array<[string, string]>;
    children: Array<SvgAstNode | string>;
  }

  const stack: SvgAstNode[] = [];
  let root: SvgAstNode | null = null;
  let elementCount = 0;
  let pos = 0;
  const len = cursor.length;

  const attrPattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;

  while (pos < len) {
    const lt = cursor.indexOf('<', pos);
    if (lt < 0) {
      if (cursor.slice(pos).trim().length > 0) {
        throw new BadRequestException('Unexpected trailing text outside root <svg> element.');
      }
      break;
    }
    if (lt > pos) {
      const textChunk = cursor.slice(pos, lt);
      if (textChunk.includes('>')) {
        throw new BadRequestException('Unescaped ">" in SVG text content.');
      }
      const decodedText = decodeAndValidateXmlEntities(textChunk, 'text content');
      if (decodedText.trim().length > 0) {
        if (stack.length === 0) {
          throw new BadRequestException('Text is not permitted outside the root <svg> element.');
        }
        const currentParent = stack[stack.length - 1];
        if (!['title', 'desc', 'text', 'tspan'].includes(currentParent.tag)) {
          throw new BadRequestException(`Text content is not permitted inside <${currentParent.tag}>.`);
        }
        if (UNSAFE_SVG_VALUE_PATTERN.test(decodedText)) {
          throw new BadRequestException('SVG text content contains disallowed URLs or expressions.');
        }
        currentParent.children.push(decodedText.slice(0, 280));
      }
    }

    const gt = findTagEndQuoteAware(cursor, lt + 1);

    const rawTagContent = cursor.slice(lt + 1, gt).trim();
    if (!rawTagContent || rawTagContent.startsWith('!') || rawTagContent.startsWith('?')) {
      throw new BadRequestException('Unsupported XML construct in SVG logo.');
    }

    if (rawTagContent.startsWith('/')) {
      const closeName = rawTagContent.slice(1).trim();
      if (stack.length === 0) {
        throw new BadRequestException(`Unexpected closing tag </${closeName}>.`);
      }
      const popped = stack.pop()!;
      if (popped.tag !== closeName) {
        throw new BadRequestException(`Mismatched SVG closing tag: expected </${popped.tag}>, found </${closeName}>.`);
      }
      pos = gt + 1;
      if (stack.length === 0 && cursor.slice(pos).trim().length > 0) {
        throw new BadRequestException('Multiple root elements or trailing markup after </svg> are not permitted.');
      }
      continue;
    }

    const selfClosing = rawTagContent.endsWith('/');
    const tagBody = selfClosing ? rawTagContent.slice(0, -1).trim() : rawTagContent;
    const nameMatch = /^([A-Za-z][A-Za-z0-9:_-]*)/.exec(tagBody);
    if (!nameMatch) {
      throw new BadRequestException('Malformed SVG element name.');
    }
    const tagName = nameMatch[1];
    const lowerTag = tagName.toLowerCase();
    if (
      lowerTag === 'script' ||
      lowerTag === 'foreignobject' ||
      lowerTag === 'iframe' ||
      lowerTag === 'object' ||
      lowerTag === 'embed' ||
      lowerTag === 'image' ||
      lowerTag === 'feimage' ||
      lowerTag === 'style' ||
      lowerTag === 'a' ||
      lowerTag === 'use' ||
      lowerTag === 'symbol' ||
      !ALLOWED_SVG_ELEMENTS.has(tagName)
    ) {
      throw new BadRequestException(`SVG element <${tagName}> is not permitted in school logos.`);
    }

    if (root === null && tagName !== 'svg') {
      throw new BadRequestException('Root element of an SVG logo must be <svg>.');
    }
    if (root !== null && stack.length === 0) {
      throw new BadRequestException('Only a single root <svg> element is permitted.');
    }

    elementCount++;
    if (elementCount > maxSvgElementCount) {
      throw new BadRequestException(`SVG logo exceeds maximum complexity of ${maxSvgElementCount} elements.`);
    }
    if (stack.length + 1 > maxSvgNestingDepth) {
      throw new BadRequestException(`SVG logo exceeds maximum nesting depth of ${maxSvgNestingDepth}.`);
    }

    const isRootSvg = root === null && tagName === 'svg';
    const attrSource = tagBody.slice(tagName.length);
    const attrs: Array<[string, string]> = [];
    const seenAttrs = new Set<string>();
    let attrPos = 0;
    while (attrPos < attrSource.length) {
      while (attrPos < attrSource.length && /\s/.test(attrSource[attrPos])) {
        attrPos++;
      }
      if (attrPos >= attrSource.length) break;
      attrPattern.lastIndex = attrPos;
      const m = attrPattern.exec(attrSource);
      if (!m) {
        throw new BadRequestException(`Malformed attribute syntax in <${tagName}>.`);
      }
      const attrName = m[1];
      const attrValue = m[2] ?? m[3] ?? '';
      attrPos = attrPattern.lastIndex;

      if (attrName.toLowerCase().startsWith('on')) {
        throw new BadRequestException(`SVG event handler attribute "${attrName}" is not permitted.`);
      }
      if (!ALLOWED_SVG_ATTRIBUTES.has(attrName)) {
        throw new BadRequestException(`SVG attribute "${attrName}" on <${tagName}> is not permitted.`);
      }
      if (seenAttrs.has(attrName)) {
        throw new BadRequestException(`Duplicate SVG attribute "${attrName}" on <${tagName}>.`);
      }
      seenAttrs.add(attrName);
      const cleanValue = validateSvgAttributeValue(attrName, attrValue, isRootSvg);
      if (cleanValue.length > 0 || attrName !== 'style') {
        attrs.push([attrName, cleanValue]);
      }
    }

    if (isRootSvg) {
      if (!seenAttrs.has('xmlns')) {
        attrs.unshift(['xmlns', 'http://www.w3.org/2000/svg']);
      }
      const hasViewBox = seenAttrs.has('viewBox');
      const hasWidth = seenAttrs.has('width');
      const hasHeight = seenAttrs.has('height');
      if (!hasViewBox && (!hasWidth || !hasHeight)) {
        attrs.push(['viewBox', '0 0 512 512']);
      }
    }

    const node: SvgAstNode = { tag: tagName, attrs, children: [] };
    if (root === null) {
      root = node;
    } else {
      stack[stack.length - 1].children.push(node);
    }
    if (!selfClosing) {
      stack.push(node);
    }
    pos = gt + 1;
  }

  if (!root || stack.length !== 0) {
    throw new BadRequestException('SVG logo has unclosed XML elements or missing root <svg>.');
  }

  function serializeNode(node: SvgAstNode): string {
    const serializedAttrs = node.attrs
      .map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`)
      .join('');
    if (node.children.length === 0) {
      return `<${node.tag}${serializedAttrs}/>`;
    }
    const inner = node.children
      .map(child => (typeof child === 'string' ? escapeXmlText(child) : serializeNode(child)))
      .join('');
    return `<${node.tag}${serializedAttrs}>${inner}</${node.tag}>`;
  }

  return serializeNode(root);
}

/**
 * Choose the rasterization density for a sanitized SVG so the rendered bitmap
 * stays within the logo pixel limits. The input is the sanitizer output, so the
 * root attributes are already normalized (double-quoted, pixel or percentage
 * widths, four-number viewBox). Intrinsic size follows SVG rules: explicit pixel
 * width/height win, a missing dimension follows the viewBox aspect ratio, and
 * percentage or absent dimensions fall back to the viewBox size.
 */
export function resolveSvgRasterDensity(sanitizedSvg: string): number {
  const rootMatch = /^<svg\b([^>]*)>/.exec(sanitizedSvg);
  if (!rootMatch) throw new BadRequestException('SVG logo must have a single root <svg> element.');
  const attrs = new Map<string, string>();
  for (const attr of rootMatch[1].matchAll(/\s([A-Za-z:][A-Za-z0-9:_-]*)="([^"]*)"/g)) attrs.set(attr[1], attr[2]);

  const absolute = (name: 'width' | 'height'): number | null => {
    const raw = attrs.get(name);
    if (raw === undefined || raw.endsWith('%')) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) throw new BadRequestException(`SVG root ${name} must be a positive finite number.`);
    return value;
  };
  let viewBoxWidth: number | null = null;
  let viewBoxHeight: number | null = null;
  const viewBox = attrs.get('viewBox');
  if (viewBox !== undefined) {
    const parts = viewBox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) {
      throw new BadRequestException('SVG viewBox must have a positive finite width and height.');
    }
    viewBoxWidth = parts[2];
    viewBoxHeight = parts[3];
  }

  const explicitWidth = absolute('width');
  const explicitHeight = absolute('height');
  let width: number;
  let height: number;
  if (explicitWidth !== null && explicitHeight !== null) {
    width = explicitWidth;
    height = explicitHeight;
  } else if (explicitWidth !== null) {
    width = explicitWidth;
    height = viewBoxWidth && viewBoxHeight ? (explicitWidth * viewBoxHeight) / viewBoxWidth : explicitWidth;
  } else if (explicitHeight !== null) {
    height = explicitHeight;
    width = viewBoxWidth && viewBoxHeight ? (explicitHeight * viewBoxWidth) / viewBoxHeight : explicitHeight;
  } else if (viewBoxWidth && viewBoxHeight) {
    width = viewBoxWidth;
    height = viewBoxHeight;
  } else {
    return 144;
  }

  const largest = Math.max(width, height);
  if (!Number.isFinite(largest) || largest > maxSchoolLogoDimension) {
    throw new BadRequestException(`SVG logo dimensions exceed the maximum of ${maxSchoolLogoDimension}px.`);
  }
  // Small logos render at 2x for sharper downscaling; larger ones are scaled so
  // the bitmap never exceeds twice the 1024px working size (<= 2048px).
  if (largest <= 1024) return 144;
  return Math.min(144, Math.max(72, Math.floor((1024 / largest) * 144)));
}

export async function validateAnnouncementPng(bytes: Buffer) {
  if (bytes.length > maxBytes || bytes.length < 57 || !bytes.subarray(0, 8).equals(signature)) throw new BadRequestException('A PNG image up to 5 MB is required.');
  if (announcementProcessing >= maxConcurrentAnnouncementProcessing) throw new HttpException('Image processing is busy. Try again shortly.', 429);
  announcementProcessing++;
  const started = performance.now();
  try {
    const source = sharp(bytes, { limitInputPixels: 12000000, failOn: 'warning', animated: false });
    const metadata = await source.metadata();
    if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) > 1) throw new Error('Unsupported image');
    // Re-encoding verifies the complete raster and removes metadata by default.
    const original = await source.clone().rotate().png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    const display = await source.clone().rotate().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    const thumbnail = await source.clone().rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if ([original.data, display, thumbnail].some(image => image.length > maxBytes)) throw new Error('Processed image is too large');
    console.log(JSON.stringify({ event: 'announcement_image_processed', durationMs: Math.round(performance.now() - started), inputBytes: bytes.length, originalBytes: original.data.length, displayBytes: display.length, thumbnailBytes: thumbnail.length }));
    return { bytes: original.data, width: original.info.width, height: original.info.height, display, thumbnail };
  } catch {
    throw new BadRequestException('PNG image could not be decoded or exceeds the image limits.');
  } finally { announcementProcessing--; }
}

export async function validateSchoolLogoPng(bytes: Buffer) {
  if (!Buffer.isBuffer(bytes) || bytes.length > maxSchoolLogoBytes || bytes.length < 57 || !bytes.subarray(0, 8).equals(signature)) {
    throw new BadRequestException('A valid PNG image up to 2 MB is required.');
  }
  if (schoolLogoProcessing >= maxConcurrentSchoolLogoProcessing) throw new HttpException('Image processing is busy. Try again shortly.', 429);
  schoolLogoProcessing++;
  const started = performance.now();
  try {
    const source = sharp(bytes, { limitInputPixels: maxSchoolLogoPixels, failOn: 'warning', animated: false });
    const metadata = await source.metadata();
    if (
      metadata.format !== 'png' ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > maxSchoolLogoDimension ||
      metadata.height > maxSchoolLogoDimension ||
      metadata.width * metadata.height > maxSchoolLogoPixels ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new Error('Unsupported school logo image');
    }
    // Re-encode into a bounded raster PNG and strip all embedded metadata.
    const normalized = await source
      .clone()
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    if (
      normalized.info.format !== 'png' ||
      !normalized.info.width ||
      !normalized.info.height ||
      normalized.data.length === 0 ||
      normalized.data.length > maxSchoolLogoBytes
    ) {
      throw new Error('Processed school logo is invalid or too large');
    }
    console.log(JSON.stringify({
      event: 'school_logo_processed',
      durationMs: Math.round(performance.now() - started),
      inputBytes: bytes.length,
      outputBytes: normalized.data.length,
      width: normalized.info.width,
      height: normalized.info.height,
    }));
    return {
      bytes: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      mimeType: 'image/png' as const,
    };
  } catch {
    throw new BadRequestException('PNG logo could not be decoded or exceeds the allowed dimensions.');
  } finally {
    schoolLogoProcessing--;
  }
}

export async function validateSchoolLogoUpload(bytes: Buffer, contentType?: string) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > maxSchoolLogoBytes) {
    throw new BadRequestException('A valid SVG, PNG, or WebP school logo up to 2 MB is required.');
  }
  const declaredMime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (!['image/png', 'image/webp', 'image/svg+xml'].includes(declaredMime)) {
    throw new BadRequestException('Unsupported school logo format. Upload an SVG, PNG, or WebP image.');
  }

  const isPngSignature = bytes.length >= 57 && bytes.subarray(0, 8).equals(signature);
  const isWebpSignature =
    bytes.length >= 30 &&
    bytes.subarray(0, 4).equals(riffSignature) &&
    bytes.subarray(8, 12).equals(webpSignature);

  if (declaredMime === 'image/png') {
    if (!isPngSignature) {
      throw new BadRequestException('File signature does not match image/png.');
    }
    const pngResult = await validateSchoolLogoPng(bytes);
    return { ...pngResult, sourceFormat: 'png' as const };
  }

  let inputBuffer = bytes;
  let expectedFormat: 'webp' | 'svg' = 'webp';
  let svgDensity = 144;

  if (declaredMime === 'image/webp') {
    if (!isWebpSignature) {
      throw new BadRequestException('File signature does not match image/webp.');
    }
    expectedFormat = 'webp';
  } else {
    if (isPngSignature || isWebpSignature || (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8)) {
      throw new BadRequestException('File signature does not match image/svg+xml.');
    }
    const sanitizedSvg = sanitizeAndValidateSchoolLogoSvg(bytes);
    svgDensity = resolveSvgRasterDensity(sanitizedSvg);
    inputBuffer = Buffer.from(sanitizedSvg, 'utf8');
    expectedFormat = 'svg';
  }

  if (schoolLogoProcessing >= maxConcurrentSchoolLogoProcessing) throw new HttpException('Image processing is busy. Try again shortly.', 429);
  schoolLogoProcessing++;
  const started = performance.now();
  try {
    const source = sharp(inputBuffer, {
      limitInputPixels: maxSchoolLogoPixels,
      failOn: 'warning',
      animated: false,
      ...(expectedFormat === 'svg' ? { density: svgDensity } : {}),
    });
    const metadata = await source.metadata();
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > maxSchoolLogoDimension ||
      metadata.height > maxSchoolLogoDimension ||
      metadata.width * metadata.height > maxSchoolLogoPixels ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new Error('Unsupported school logo image');
    }
    // Render into a normalized, metadata-stripped PNG raster preserving aspect ratio and transparency.
    const normalized = await source
      .clone()
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    if (
      normalized.info.format !== 'png' ||
      !normalized.info.width ||
      !normalized.info.height ||
      normalized.data.length === 0 ||
      normalized.data.length > maxSchoolLogoBytes
    ) {
      throw new Error('Processed school logo is invalid or too large');
    }
    console.log(JSON.stringify({
      event: 'school_logo_processed',
      sourceFormat: expectedFormat,
      durationMs: Math.round(performance.now() - started),
      inputBytes: bytes.length,
      outputBytes: normalized.data.length,
      width: normalized.info.width,
      height: normalized.info.height,
    }));
    return {
      bytes: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      mimeType: 'image/png' as const,
      sourceFormat: expectedFormat,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException('School logo could not be decoded or exceeds the allowed dimensions.');
  } finally {
    schoolLogoProcessing--;
  }
}

let client: S3Client | undefined;
function s3() {
  if (client) return client;
  const { ANNOUNCEMENT_MEDIA_ENDPOINT: endpoint, ANNOUNCEMENT_MEDIA_BUCKET: bucket, ANNOUNCEMENT_MEDIA_ACCESS_KEY: accessKeyId, ANNOUNCEMENT_MEDIA_SECRET_KEY: secretAccessKey } = config;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new ServiceUnavailableException('Announcement media storage is not configured.');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(config.NODE_ENV !== 'production' && url.hostname === '127.0.0.1')) throw new ServiceUnavailableException('Announcement media requires HTTPS storage.');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new ServiceUnavailableException('Invalid announcement media endpoint.');
  client = new S3Client({ endpoint, region: config.ANNOUNCEMENT_MEDIA_REGION, forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3,
    requestHandler: { connectionTimeout: 3000, requestTimeout: 15000 },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  return client;
}

const validAnnouncementKey = (key: string) => /^announcements\/[0-9a-f-]{36}\/[0-9a-f-]{36}(?:-(?:display|thumbnail))?\.png$/.test(key);
export const validSchoolLogoKey = (key: string, schoolId?: string) =>
  /^school-logos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/.test(key) &&
  (!schoolId || key.startsWith(`school-logos/${schoolId}/`));
const validKey = (key: string) => validAnnouncementKey(key) || validSchoolLogoKey(key);
const maxBytesForKey = (key: string) => validSchoolLogoKey(key) ? maxSchoolLogoBytes : maxBytes;
function localPath(key: string) {
  if (config.NODE_ENV === 'production') throw new ServiceUnavailableException('Local announcement media is disabled in production.');
  const root = config.ANNOUNCEMENT_MEDIA_DIRECTORY ?? join(process.cwd(), '.runtime', 'announcement-media');
  if (!isAbsolute(root)) throw new ServiceUnavailableException('Announcement media directory must be absolute.');
  return join(root, ...key.split('/'));
}

export async function openObjectStream(key: string, provider = mediaProvider()): Promise<{ stream: Readable; byteSize: number | undefined }> {
  if (!validKey(key)) throw new BadRequestException('Invalid media key.');
  const limitBytes = maxBytesForKey(key);
  try {
    if (provider === 'local') {
      const path = localPath(key);
      const info = await stat(path);
      if (!info.isFile() || info.size > limitBytes) throw new ServiceUnavailableException('Stored image is too large or unavailable.');
      return { stream: createReadStream(path), byteSize: info.size };
    }
    const result = await s3().send(new GetObjectCommand({ Bucket: config.ANNOUNCEMENT_MEDIA_BUCKET, Key: key }));
    const stream = result.Body as Readable | undefined;
    if (!stream || (result.ContentLength ?? 0) > limitBytes) {
      stream?.destroy();
      throw new ServiceUnavailableException('Stored image is too large or unavailable.');
    }
    return { stream, byteSize: result.ContentLength };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const failure = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    if (failure.code === 'ENOENT' || failure.$metadata?.httpStatusCode === 404) throw new NotFoundException('Announcement media unavailable.');
    console.error(JSON.stringify({ event: 'announcement_storage_failed', method: 'GET', provider, errorType: failure.name ?? 'unknown' }));
    throw new ServiceUnavailableException('Announcement media storage is unavailable.');
  }
}

export async function objectRequest(method: 'PUT' | 'GET' | 'DELETE', key: string, payload?: Buffer, provider = mediaProvider()): Promise<Buffer | null> {
  if (!validKey(key)) throw new BadRequestException('Invalid media key.');
  const limitBytes = maxBytesForKey(key);
  if (payload && (payload.length === 0 || payload.length > limitBytes)) throw new BadRequestException('Invalid image size.');
  if (method === 'GET') {
    const { stream } = await openObjectStream(key, provider);
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      for await (const chunk of stream) {
        received += chunk.length;
        if (received > limitBytes) throw new ServiceUnavailableException('Stored image is too large.');
        chunks.push(Buffer.from(chunk));
      }
    } finally { stream.destroy(); }
    return Buffer.concat(chunks, received);
  }
  try {
    if (provider === 'local') {
      const path = localPath(key);
      if (method === 'PUT') {
        if (!payload) throw new BadRequestException('Image bytes are required.');
        await mkdir(dirname(path), { recursive: true, mode: 0o700 });
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, payload, { flag: 'wx', mode: 0o600 });
          await rename(temporary, path);
        } finally { await rm(temporary, { force: true }).catch(() => undefined); }
        return null;
      }
      if (method === 'DELETE') {
        await rm(path, { force: true });
        const temporaryFiles = await readdir(dirname(path)).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return [];
          throw error;
        });
        for (const file of temporaryFiles) {
          if (file.startsWith(`${basename(path)}.`) && /^[0-9a-f-]{36}\.tmp$/.test(file.slice(basename(path).length + 1))) await rm(join(dirname(path), file), { force: true });
        }
        return null;
      }
    }
    const Bucket = config.ANNOUNCEMENT_MEDIA_BUCKET;
    if (method === 'PUT') {
      if (!payload) throw new BadRequestException('Image bytes are required.');
      await s3().send(new PutObjectCommand({ Bucket, Key: key, Body: payload, ContentType: 'image/png', CacheControl: 'private, no-store' }));
      return null;
    }
    if (method === 'DELETE') { await s3().send(new DeleteObjectCommand({ Bucket, Key: key })); return null; }
    return null;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const failure = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    console.error(JSON.stringify({ event: 'announcement_storage_failed', method, provider, errorType: failure.name ?? 'unknown' }));
    throw new ServiceUnavailableException('Announcement media storage is unavailable.');
  }
}

export async function deleteSchoolLogoObject(
  key: string | null | undefined,
  schoolId?: string,
  provider = mediaProvider(),
): Promise<boolean> {
  if (!key || !validSchoolLogoKey(key, schoolId)) return false;
  try {
    await objectRequest('DELETE', key, undefined, provider);
    return true;
  } catch (error) {
    const failure = error as { name?: string };
    console.error(JSON.stringify({
      event: 'school_logo_delete_failed',
      schoolId: schoolId ?? null,
      provider,
      errorType: failure.name ?? 'unknown',
    }));
    return false;
  }
}

export async function cleanupOrphanedSchoolLogos(schoolId: string, activeKey: string | null, provider = mediaProvider()): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) return;
  if (provider !== 'local') return;
  try {
    const dir = dirname(localPath(`school-logos/${schoolId}/00000000-0000-0000-0000-000000000000.png`));
    const files = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const file of files) {
      const candidateKey = `school-logos/${schoolId}/${file}`;
      if (candidateKey === activeKey) continue;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png(?:\.[0-9a-f-]{36}\.tmp)?$/.test(file)) {
        await rm(join(dir, file), { force: true }).catch(() => undefined);
      }
    }
  } catch {
    console.error(JSON.stringify({ event: 'school_logo_orphan_cleanup_failed', schoolId }));
  }
}
