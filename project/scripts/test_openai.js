import { readFile } from 'fs/promises';
import path from 'path';

try {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'project', '.env.local'),
    path.resolve(process.cwd(), '..', '.env.local'),
  ];
  let envPath = null;
  for (const p of candidates) {
    try {
      await readFile(p, 'utf8');
      envPath = p;
      break;
    } catch (e) {
      // ignore
    }
  }
  if (!envPath) {
    throw new Error('Could not find .env.local in expected locations');
  }
  const envText = await readFile(envPath, 'utf8');
  const line = envText.split(/\r?\n/).find(l => l.startsWith('OPENAI_API_KEY='));
  if (!line) {
    console.error('OPENAI_API_KEY not found in .env.local');
    process.exit(2);
  }
  const key = line.split('=')[1].trim();
  if (!key) {
    console.error('OPENAI_API_KEY is empty');
    process.exit(2);
  }

  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Você é um sistema de teste que responde apenas com PONG quando solicitado.' },
      { role: 'user', content: "Teste de conectividade: responda apenas com 'PONG'." },
    ],
    max_tokens: 10,
    temperature: 0,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  const reply = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
  console.log('OPENAI_TEST_REPLY:');
  console.log(reply.trim());
} catch (err) {
  console.error('TEST_ERROR:', err?.message ?? err);
  process.exit(1);
}
