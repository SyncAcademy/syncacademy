import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = resolve(process.cwd());

console.log('[Continuous Architecture] Running architecture and governance verification...');

const violations = [];

// 1. Secret and Credentials Hygiene (Zero Committed Secrets)
console.log('  - Checking for committed secrets and tracked environment files...');
try {
  const trackedFiles = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  const keyTokens = ['BEGIN ' + 'PRIVATE KEY', 'BEGIN ' + 'RSA PRIVATE KEY', 'BEGIN ' + 'OPENSSH PRIVATE KEY'];

  for (const file of trackedFiles) {
    // Skip self-check
    if (file === 'scripts/verify-architecture.mjs') continue;

    const baseName = file.split('/').pop() || '';
    if (baseName === '.env' || (baseName.startsWith('.env.') && baseName !== '.env.example')) {
      violations.push(`Forbidden tracked environment file: ${file}`);
    }

    if (file.startsWith('.runtime/') || file.includes('/.runtime/')) {
      violations.push(`Forbidden tracked runtime file: ${file}`);
    }

    // Inspect non-binary source files for private keys
    if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs') || file.endsWith('.json')) {
      const fullPath = join(ROOT_DIR, file);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        for (const token of keyTokens) {
          if (content.includes(token)) {
            violations.push(`Potential private key found in tracked file: ${file}`);
            break;
          }
        }
      }
    }
  }
} catch (err) {
  console.warn('  [WARN] Could not run git ls-files:', err.message);
}

// 2. Monorepo Boundary and Cross-Workspace Isolation
console.log('  - Checking monorepo boundaries and cross-workspace isolation...');
function scanImports(dir, forbiddenPatterns, workspaceName) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.tmp' && !entry.name.startsWith('.')) {
        scanImports(fullPath, forbiddenPatterns, workspaceName);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      const content = readFileSync(fullPath, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(
            `Illegal import boundary violation in ${workspaceName} (${relative(ROOT_DIR, fullPath)}): imports matching ${pattern}`
          );
        }
      }
    }
  }
}

// apps/web must not import apps/api or its internal modules
scanImports(
  join(ROOT_DIR, 'apps/web/src'),
  [/from\s+['"][^'"]*apps\/api/i, /from\s+['"]@syncacademy\/api/i],
  'apps/web'
);

// apps/api must not import apps/web
scanImports(
  join(ROOT_DIR, 'apps/api/src'),
  [/from\s+['"][^'"]*apps\/web/i, /from\s+['"]syncacademy-web/i],
  'apps/api'
);

// 3. UI Preservation Governance (No competing CSS frameworks)
console.log('  - Checking UI preservation governance (AGENTS.md Section 5)...');
const webPackageJsonPath = join(ROOT_DIR, 'apps/web/package.json');
if (existsSync(webPackageJsonPath)) {
  const webPkg = JSON.parse(readFileSync(webPackageJsonPath, 'utf-8'));
  const allDeps = {
    ...(webPkg.dependencies || {}),
    ...(webPkg.devDependencies || {}),
  };

  const forbiddenCssFrameworks = ['tailwindcss', 'bootstrap', 'bulma', 'foundation-sites', '@chakra-ui/react'];
  for (const framework of forbiddenCssFrameworks) {
    if (allDeps[framework]) {
      violations.push(`Competing CSS framework '${framework}' detected in apps/web/package.json. Violates AGENTS.md Section 5.`);
    }
  }
}

// 4. Multi-Tenancy and Tenant Scoping Governance
console.log('  - Checking Prisma schema multi-tenant constraints...');
const schemaPath = join(ROOT_DIR, 'apps/api/prisma/schema.prisma');
if (existsSync(schemaPath)) {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  if (!schemaContent.includes('model School') || !schemaContent.includes('schoolId')) {
    violations.push('Prisma schema missing primary tenant model School or schoolId references.');
  }
}

// Result Evaluation
if (violations.length > 0) {
  console.error('\n[Continuous Architecture] Verification FAILED with violations:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log('\n[Continuous Architecture] Verification PASSED cleanly.');
}
