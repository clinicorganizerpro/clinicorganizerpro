import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const projectRoot = fs.existsSync(path.join(cwd, 'package.json'))
  ? cwd
  : fs.existsSync(path.join(cwd, 'project', 'package.json'))
    ? path.join(cwd, 'project')
    : cwd;

function loadEnvFile(fileName: string) {
  const filePath = path.join(projectRoot, fileName);

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

    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');
