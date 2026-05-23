import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('..', import.meta.url)); // scripts/ -> project/
const serverPath = path.join(projectRoot, 'backend', 'server.ts');

// Windows-safe shell execution to avoid spawn EINVAL issues.
const cmd =
  process.platform === 'win32'
    ? `npx tsx "${serverPath}"`
    : `npx tsx "${serverPath}"`;

const childEnv = { ...process.env };

if (process.platform === 'win32' && !childEnv.NODE_OPTIONS?.includes('--use-system-ca')) {
  childEnv.NODE_OPTIONS = [childEnv.NODE_OPTIONS, '--use-system-ca'].filter(Boolean).join(' ');
}

const child = spawn(cmd, {
  stdio: 'inherit',
  shell: true,
  env: childEnv,
});

child.on('exit', (code) => process.exit(code ?? 0));
