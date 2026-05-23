import { readFile } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

async function loadKey() {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'project', '.env.local'),
    path.resolve(process.cwd(), '..', '.env.local'),
  ];
  for (const p of candidates) {
    try {
      const s = await readFile(p, 'utf8');
      const line = s.split(/\r?\n/).find(l => l.startsWith('OPENAI_API_KEY='));
      if (line) return line.split('=')[1].trim();
    } catch (e) {
      // ignore
    }
  }
  return process.env.OPENAI_API_KEY;
}

(async () => {
  try {
    const key = await loadKey();
    if (!key) {
      console.error('OPENAI_API_KEY not found in .env.local or environment');
      process.exit(2);
    }

    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const client = new OpenAI({ apiKey: key });

    let text = null;
    try {
      const res = await client.responses.create({ model, input: 'write a haiku about ai' });

      // Try robust extraction of text
      if (typeof res.output_text === 'string') text = res.output_text;
      else if (res.output && Array.isArray(res.output)) {
        text = res.output
          .map(item => {
            if (typeof item === 'string') return item;
            if (item.content) {
              if (Array.isArray(item.content)) return item.content.map(c => c.text || '').join('');
              if (typeof item.content === 'string') return item.content;
            }
            return JSON.stringify(item);
          })
          .join('\n');
      } else {
        text = JSON.stringify(res);
      }

      console.log('OPENAI_SDK_REPLY:');
      console.log(text);
    } catch (err) {
      console.error('OPENAI_SDK_ERROR:', err?.message ?? err);
      // Try Hugging Face if configured
      const hfKey = process.env.HF_API_KEY || await (async () => {
        try {
          const s = await readFile(path.resolve(process.cwd(), '.env.local'), 'utf8');
          const line = s.split(/\r?\n/).find(l => l.startsWith('HF_API_KEY='));
          if (line) return line.split('=')[1].trim();
        } catch (_) {}
        return null;
      })();

      const hfModel = process.env.HF_MODEL || 'gpt2';
      if (!hfKey) {
        console.error('HF_API_KEY not found; cannot fallback to Hugging Face.');
        process.exit(1);
      }

      try {
        const hfResp = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: 'Write a haiku about AI', parameters: { max_new_tokens: 128 } }),
        });
        const hfJson = await hfResp.json();
        let hfText = null;
        if (Array.isArray(hfJson) && hfJson[0]?.generated_text) hfText = hfJson[0].generated_text;
        else if (hfJson?.generated_text) hfText = hfJson.generated_text;
        else if (typeof hfJson === 'string') hfText = hfJson;
        else hfText = JSON.stringify(hfJson);

        console.log('HUGGINGFACE_REPLY:');
        console.log(hfText);
        process.exit(0);
      } catch (hfErr) {
        console.error('HUGGINGFACE_ERROR:', hfErr?.message ?? hfErr);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('OPENAI_SDK_ERROR:', err?.message ?? err);
    if (err?.response) console.error('DETAILS:', err.response);
    process.exit(1);
  }
})();
