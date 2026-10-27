// pnpm test:e2e: build the test-only extension (`--mode e2e`, which also runs on the local fixture
// server) and the web app (site/dist), then run the Playwright suite against them. Extra arguments go to `playwright test`.
import { spawnSync } from 'node:child_process';

const shell = process.platform === 'win32';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('pnpm', ['exec', 'wxt', 'build', '--mode', 'e2e']);
// The parity test also loads the built web app.
run('pnpm', ['--dir', 'site', 'build']);
run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)]);
