import { Router, type Request, type Response } from 'express';
import OpenAI from 'openai';

type ChatHistoryItem = {
  role?: string;
  content?: string;
};

type ChatRequestBody = {
  message?: string;
  history?: ChatHistoryItem[];
  patientId?: string;
};

const router = Router();

const allowedRoles = new Set(['user', 'assistant', 'system']);

function normalizeHistory(history: ChatHistoryItem[] | undefined) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => ({
      role: allowedRoles.has(String(item.role)) ? String(item.role) : 'user',
      content: typeof item.content === 'string' ? item.content.trim() : '',
    }))
    .filter((item) => item.content)
    .slice(-12) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

router.post('/chat', async (req: Request, res: Response) => {
  const body = req.body as ChatRequestBody;
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    res.status(400).json({ success: false, error: 'Mensagem vazia.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    res.status(500).json({
      success: false,
      error: 'OPENAI_API_KEY não configurada no backend local.',
    });
    return;
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Você é o assistente do Clinic Organizer Pro, um SaaS para clínicas de estética. Responda em português do Brasil, com clareza e objetividade. Não invente dados do sistema; quando faltar contexto, peça a informação necessária.',
        },
        ...normalizeHistory(body.history),
        { role: 'user', content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '';

    if (!reply) {
      res.status(502).json({ success: false, error: 'A IA retornou uma resposta vazia.' });
      return;
    }

    res.json({ success: true, reply, provider: 'local-openai', model });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
