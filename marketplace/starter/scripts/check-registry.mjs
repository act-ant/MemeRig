import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
export const catalog = JSON.parse(readFileSync(resolve(root, 'index.json'), 'utf8'));
assert(catalog.version === 1 && Array.isArray(catalog.templates) && catalog.templates.length, 'Expected a nonempty version 1 registry');
const seen = new Set(['blank', 'native', 'learn-harness', 'trellis', 'game-dev']);
for (const { id, type, name, path } of catalog.templates) {
  assert(typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && !seen.has(id), `Invalid, reserved or duplicate ID: ${id}`);
  seen.add(id);
  assert(typeof name === 'string' && name.trim(), `Missing name: ${id}`);
  assert(type === 'spec' || type === 'workflow', `Unsupported type: ${type}`);
  assert(path === (type === 'spec' ? `specs/${id}` : `workflows/${id}/workflow.md`), `Invalid path: ${path}`);
  const entry = realpathSync(resolve(root, path, ...(type === 'spec' ? ['index.md'] : [])));
  const rel = relative(root, entry);
  assert(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel) && statSync(entry).isFile(), `Invalid entry: ${path}`);
  const text = readFileSync(entry, 'utf8');
  assert(text.trim(), `Empty entry: ${path}`);
  if (type === 'workflow') {
    const lines = text.split(/\r?\n/);
    for (const heading of ['Phase Index', 'Phase 1: Plan', 'Phase 2: Execute', 'Phase 3: Finish']) {
      assert(lines.includes('## ' + heading), `Missing heading ${heading}: ${id}`);
    }
    for (const status of ['no_task', 'planning', 'planning-inline', 'in_progress', 'in_progress-inline', 'completed']) {
      assert(lines.includes(`[workflow-state:${status}]`) && lines.includes(`[/workflow-state:${status}]`), `Missing state block ${status}: ${id}`);
    }
  }
}
console.log(`Validated ${catalog.templates.length} registry entries`);
