import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(projectRoot, '.env'));
loadEnvFile(path.join(projectRoot, '.env.local'));

const childEnv = { ...process.env };

if (process.platform === 'win32' && !childEnv.NODE_OPTIONS?.includes('--use-system-ca')) {
  childEnv.NODE_OPTIONS = [childEnv.NODE_OPTIONS, '--use-system-ca'].filter(Boolean).join(' ');
}

const commands = [
  {
    name: 'api',
    command: 'npx',
    args: ['tsx', 'backend/server.ts'],
  },
  {
    name: 'vite',
    command: 'npx',
    args: ['vite'],
  },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: childEnv,
    shell: process.platform === 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
