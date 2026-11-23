import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { catalog, root } from './check-registry.mjs';

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const repo = git('rev-parse', '--show-toplevel');
const prefix = git('rev-parse', '--show-prefix').replace(/\/$/, '');
const revision = git('rev-parse', 'HEAD');
const remote = 'https://registry.example.invalid/example/marketplace';
const source = `${remote}${prefix ? '/' + prefix : ''}#${revision}`;
const temporary = mkdtempSync(resolve(tmpdir(), 'memerig-registry-'));
const registry = resolve(temporary, 'registry.git');
const env = {
  ...process.env,
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: `url.${pathToFileURL(registry).href}.insteadOf`,
  GIT_CONFIG_VALUE_0: remote + '.git',
};
const cli = process.argv[2] ? [process.execPath, resolve(process.argv[2])] : ['memerig'];
const python = process.platform === 'win32' ? 'python' : 'python3';
try {
  git('clone', '--bare', '--no-local', repo, registry);
  git('-C', registry, 'config', 'uploadpack.allowFilter', 'true');
  git('-C', registry, 'config', 'uploadpack.allowReachableSHA1InWant', 'true');
  for (const { id, type, path } of catalog.templates) {
    const cwd = resolve(temporary, id);
    mkdirSync(cwd);
    execFileSync('git', ['init', '-q'], { cwd });
    const args = type === 'spec'
      ? ['--template', id, '--registry', source]
      : ['--workflow', id, '--workflow-source', source];
    execFileSync(cli[0], [...cli.slice(1), 'init', '--yes', '--codex', ...args], { cwd, env, stdio: 'inherit' });
    const expected = readFileSync(resolve(root, path, ...(type === 'spec' ? ['index.md'] : [])), 'utf8');
    const installed = readFileSync(resolve(cwd, type === 'spec' ? '.memerig/spec/index.md' : '.memerig/workflow.md'), 'utf8');
    assert.equal(installed.replaceAll('\r\n', '\n'), expected.replaceAll('\r\n', '\n'), `Installed content differs: ${id}`);
    if (type === 'workflow') {
      const phase = execFileSync(python, ['.memerig/scripts/get_context.py', '--mode', 'phase'], { cwd, encoding: 'utf8' });
      assert.match(phase, /Phase 1: Plan/);
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
