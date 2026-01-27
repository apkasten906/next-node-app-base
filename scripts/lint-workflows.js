/*
 * Cross-platform workflow lint runner.
 * - Windows: downloads actionlint zip and runs via PowerShell
 * - macOS/Linux: downloads actionlint tarball and runs via bash
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const version = process.env.ACTIONLINT_VERSION || '1.7.10';
const workflowsPath = process.env.WORKFLOWS_PATH || '.github/workflows';

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.platform === 'win32') {
  const ps1 = path.join(__dirname, 'actionlint.ps1');
  run('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    ps1,
    '-Version',
    version,
    '-WorkflowsPath',
    workflowsPath,
  ]);
} else {
  const sh = path.join(__dirname, 'actionlint.sh');
  run('bash', [sh, version, workflowsPath]);
}
