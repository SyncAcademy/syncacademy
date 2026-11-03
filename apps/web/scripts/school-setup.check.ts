import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RendererFactory2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { SchoolSetupStore } from '../src/app/features/headmaster/school-setup.store';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { AcademicDataService } from '../src/app/core/services/academic-data.service';
import {
  DEFAULT_SCHOOL_PRIMARY,
  DEFAULT_SCHOOL_SECONDARY,
  resolveSecondarySurfaceTokens,
  computeContrastRatio,
  compositeOverlayHex,
  validateBrandHexColor,
  validateWelcomeMessageText,
  validateLogoFileClient,
} from '../src/app/core/services/school-branding.service';

const year=signal<{id:string;label:string}|undefined>(undefined);
const workspace=signal<any>(null);
const academic=signal<any>({policy:{revision:1}});
TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());
TestBed.configureTestingModule({providers:[
  {provide:DOCUMENT,useValue:{body:null,querySelectorAll:()=>[]}},
  {provide:RendererFactory2,useValue:{begin(){},end(){},whenRenderingDone:()=>Promise.resolve()}},
  {provide:SchoolApiService,useValue:{data:workspace}},
  {provide:AcademicYearService,useValue:{headYear:year}},
  {provide:AcademicDataService,useValue:{data:academic}},
]});
const store=TestBed.inject(SchoolSetupStore);
assert.equal(store.steps().length,7);
assert.equal(store.complete(),0,'loading must not claim school setup is complete');
year.set({id:'year-1',label:'2026'});
workspace.set({school:{name:'Example School',code:'EX-01',region:'Kigoma'},classes:[{id:'class-1',yearId:'year-1',_count:{enrollments:1}}],members:[{role:'TEACHER',active:true,user:{enabled:true}}],classSubjects:[{classroomId:'class-1',subjectId:'math'}],assignments:[{classroomId:'class-1',subjectId:'math',membership:{active:true,user:{enabled:true}}}]});
assert.equal(store.profile()?.name,'Example School');
assert.equal(store.steps().find(s=>s.id==='classes')?.done,true);
assert.equal(store.steps().find(s=>s.id==='staff')?.done,true);
assert.equal(store.steps().find(s=>s.id==='assignments')?.done,true);
assert.equal(store.steps().find(s=>s.id==='students')?.done,true);
assert.equal(store.steps().find(s=>s.id==='grading')?.done,false,'default grading requires review');
academic.set({policy:{revision:2}});
assert.equal(store.steps().find(s=>s.id==='grading')?.done,true);
year.set({id:'year-2',label:'2027'});
assert.equal(store.steps().find(s=>s.id==='classes')?.done,false,'class setup is scoped to selected year');
assert.equal(store.steps().find(s=>s.id==='school')?.done,true,'school profile survives year switch');

// School Branding validation checks (WCAG 2.2 AA contrast, HEX normalization, welcome message, and logo file rules)
assert.equal(DEFAULT_SCHOOL_PRIMARY, '#B45309');
assert.equal(DEFAULT_SCHOOL_SECONDARY, '#1E293B');

const darkPrimaryContrast = validateBrandHexColor('#1b4d3e', 'Primary');
assert.equal(darkPrimaryContrast.valid, true);
assert.equal(darkPrimaryContrast.normalized, '#1B4D3E');
assert.equal(darkPrimaryContrast.meetsWcagAa, true);

// F-11: Legacy #E87E24 (2.81:1) must be rejected by Primary contrast validation
const legacyOrangeContrast = validateBrandHexColor('#E87E24', 'Primary');
assert.equal(legacyOrangeContrast.valid, false);
assert.equal(legacyOrangeContrast.meetsWcagAa, false);

// F-12 & F-13: Secondary color validation supports both dark and light backgrounds and rejects mid-tones
const darkSecondaryContrast = validateBrandHexColor('#0F172A', 'Secondary');
assert.equal(darkSecondaryContrast.valid, true);
assert.equal(darkSecondaryContrast.tone, 'dark');

const lightSecondaryContrast = validateBrandHexColor('#F8FAFC', 'Secondary');
assert.equal(lightSecondaryContrast.valid, true);
assert.equal(lightSecondaryContrast.tone, 'light');

const midToneSecondaryContrast = validateBrandHexColor('#CBD5E1', 'Secondary');
assert.equal(midToneSecondaryContrast.valid, false);
assert.equal(midToneSecondaryContrast.meetsWcagAa, false);

const lightTokens = resolveSecondarySurfaceTokens('#F8FAFC', '#1E3A8A');
assert.equal(lightTokens.tone, 'light');
assert.equal(lightTokens.foregroundColor, '#0F172A');
assert.equal(lightTokens.mutedForegroundColor, '#475569');
assert.equal(lightTokens.requiresActiveDistinction, false);

const identicalTokens = resolveSecondarySurfaceTokens('#1E293B', '#1E293B');
assert.equal(identicalTokens.requiresActiveDistinction, true);
assert.equal(identicalTokens.activeNavBorderColor, '#FFFFFF');
assert.equal(identicalTokens.activeNavIndicatorColor, '#FFFFFF');

const invalidHex = validateBrandHexColor('rgb(27,77,62)', 'Primary');
assert.equal(invalidHex.valid, false);

const unreadableYellowContrast = validateBrandHexColor('#FFFF00', 'Primary');
assert.equal(unreadableYellowContrast.valid, false);
assert.equal(unreadableYellowContrast.meetsWcagAa, false);
assert.match(unreadableYellowContrast.message, /WCAG 2\.2 AA requires at least 4\.5:1/);

assert.equal(validateWelcomeMessageText('Welcome to Greenhill Academy').valid, true);
assert.equal(validateWelcomeMessageText('<script>alert(1)</script>').valid, false);
assert.equal(validateWelcomeMessageText('A'.repeat(281)).valid, false);

assert.equal(validateLogoFileClient({ name: 'crest.svg', type: 'image/svg+xml', size: 12000 } as File).valid, true);
assert.equal(validateLogoFileClient({ name: 'crest.png', type: 'image/png', size: 120000 } as File).valid, true);
assert.equal(validateLogoFileClient({ name: 'crest.webp', type: 'image/webp', size: 80000 } as File).valid, true);
assert.equal(validateLogoFileClient({ name: 'script.js', type: 'application/javascript', size: 500 } as File).valid, false);
assert.equal(validateLogoFileClient({ name: 'huge.png', type: 'image/png', size: 3 * 1024 * 1024 } as File).valid, false);

// NV-05: shared vectors keep the frontend resolver aligned with the backend contract (composited colors).
const vectorFile = resolve(process.cwd(), '../../packages/shared-utils/test-vectors/secondary-surface-vectors.json');
const sharedVectors = JSON.parse(readFileSync(vectorFile, 'utf8')).vectors as Array<{
  secondary: string; valid: boolean; tone: string; mutedForeground: string; compositedSurface: string; compositedHover: string;
}>;
assert.ok(sharedVectors.length >= 15);
for (const vector of sharedVectors) {
  const tokens = resolveSecondarySurfaceTokens(vector.secondary, '#B45309');
  assert.equal(tokens.meetsWcagAa, vector.valid, `validity for ${vector.secondary}`);
  assert.equal(tokens.tone, vector.tone, `tone for ${vector.secondary}`);
  assert.equal(tokens.mutedForegroundColor, vector.mutedForeground, `muted for ${vector.secondary}`);
  assert.equal(tokens.compositedSurfaceColor, vector.compositedSurface, `surface for ${vector.secondary}`);
  assert.equal(tokens.compositedHoverColor, vector.compositedHover, `hover for ${vector.secondary}`);
  assert.equal(validateBrandHexColor(vector.secondary, 'Secondary').valid, vector.valid, `form validation for ${vector.secondary}`);
  if (vector.valid) {
    for (const background of [vector.secondary, tokens.compositedSurfaceColor, tokens.compositedHoverColor]) {
      assert.ok(computeContrastRatio(background, tokens.foregroundColor) >= 4.5, `foreground on ${background}`);
    }
    for (const background of [vector.secondary, tokens.compositedSurfaceColor]) {
      assert.ok(computeContrastRatio(background, tokens.mutedForegroundColor) >= 4.5, `muted on ${background}`);
    }
  }
}
assert.equal(compositeOverlayHex('#757575', [255, 255, 255], 0.08), '#808080');
assert.equal(validateBrandHexColor('#757575', 'Secondary').valid, false, '#757575 fails after overlay compositing');
assert.match(validateBrandHexColor('#757575', 'Secondary').message, /composited/);

TestBed.resetTestingModule();
console.log('School setup checks passed: live completion, grading revision, year scoping, and school branding validation.');
