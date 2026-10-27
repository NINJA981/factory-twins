// Asserts a built release manifest is what SPEC section 10 promises (ADR, "Testing approach"):
// no test-only origin, only the two search URLs, only the image CDNs as host permissions, and the
// smallest permission set. Run after every release build: `node scripts/check-release-manifest.mjs chrome-mv3`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/check-release-manifest.mjs <chrome-mv3|firefox-mv3>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(join(root, '.output', target, 'manifest.json'), 'utf8'));
const text = JSON.stringify(manifest);
const problems = [];

for (const needle of ['localhost', '127.0.0.1', '<all_urls>', '*://*/*', 'http://*/*']) {
  if (text.includes(needle)) problems.push(`manifest contains "${needle}"`);
}
if (/\(e2e\)|Test build/i.test(`${manifest.name} ${manifest.description}`))
  problems.push('manifest looks like an e2e build');

const allowedPermissions = target.startsWith('firefox') ? ['storage'] : ['storage', 'offscreen'];
if (
  JSON.stringify([...(manifest.permissions ?? [])].sort()) !== JSON.stringify([...allowedPermissions].sort())
) {
  problems.push(
    `permissions are ${JSON.stringify(manifest.permissions)}, expected ${JSON.stringify(allowedPermissions)}`,
  );
}
if (manifest.optional_permissions?.length) problems.push('optional_permissions must be empty');

const hosts = [...(manifest.host_permissions ?? [])].sort();
const expectedHosts = [
  'https://i5.walmartimages.com/*',
  'https://images-na.ssl-images-amazon.com/*',
  'https://m.media-amazon.com/*',
];
if (JSON.stringify(hosts) !== JSON.stringify(expectedHosts)) {
  problems.push(`host_permissions are ${JSON.stringify(hosts)}, expected ${JSON.stringify(expectedHosts)}`);
}

const matches = (manifest.content_scripts ?? []).flatMap((c) => c.matches ?? []).sort();
const expectedMatches = ['https://www.amazon.com/s*', 'https://www.walmart.com/search*'];
if (JSON.stringify(matches) !== JSON.stringify(expectedMatches)) {
  problems.push(
    `content script matches are ${JSON.stringify(matches)}, expected ${JSON.stringify(expectedMatches)}`,
  );
}

for (const war of manifest.web_accessible_resources ?? []) {
  for (const m of war.matches ?? []) {
    if (!/^https:\/\/www\.(amazon|walmart)\.com\/\*$/.test(m))
      problems.push(`web_accessible_resources match ${m}`);
  }
}

if (manifest.content_security_policy)
  problems.push('custom content_security_policy found; the default MV3 policy must apply');

if (problems.length > 0) {
  console.error(`Release manifest check FAILED for ${target}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Release manifest check passed for ${target}.`);
