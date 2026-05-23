import { useMemo, useRef, useState } from 'react';
import { Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import aiService, { type ChatHistoryItem } from '../services/aiService';
import { useApp } from '../context/useApp';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { BackButton } from '../components/layout/BackButton';
import type { Patient } from '../types';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function uid() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildPatientContextText(patient: Patient | null | undefined) {
  if (!patient) return '';
  const lines: string[] = [];
  lines.push(`Paciente: ${patient.name ?? ''}`);
  if (patient.phone) lines.push(`Telefone: ${patient.phone}`);
  if (patient.email) lines.push(`E-mail: ${patient.email}`);
  if (patient.birthDate) lines.push(`Nascimento: ${patient.birthDate}`);
  if (patient.sex) lines.push(`Sexo: ${patient.sex}`);
  if (patient.observations) lines.push(`Observações: ${patient.observations}`);
  if (Array.isArray(patient.procedures) && patient.procedures.length > 0) {
    lines.push(`Procedimentos: ${patient.procedures.join(', ')}`);
  }
  if (patient.lastVisit) lines.push(`Última visita: ${patient.lastVisit}`);
  if (typeof patient.totalSpent === 'number') lines.push(`Total gasto: ${patient.totalSpent}`);
  return lines.join('\n');
}

export function Chatbot() {
  const { patients } = useApp() as unknown as {
    patients: Patient[];
  };

  const [openHelp, setOpenHelp] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: 'assistant',
      content:
        'Olá! Eu sou o assistente do Clinic Organizer Pro. Posso ajudar com agendamentos, faturamento, automações e dúvidas gerais. Se você estiver atendendo um paciente, selecione-o para eu usar o contexto.',
    },
  ]);

  const patient = useMemo(
    () => (selectedPatientId ? patients.find((p) => p.id === selectedPatientId) ?? null : null),
    [patients, selectedPatientId],
  );

  const history = useMemo<ChatHistoryItem[]>(
    () =>
      chat
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
    [chat],
  );

  const listRef = useRef<HTMLDivElement | null>(null);

  async function send() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed };
    setChat((c) => [...c, userMsg]);
    setMessage('');

    try {
      const patientIdToSend = patient?.id;

      // A função ai_chatbot já adiciona contexto no system via patientId,
      // mas enviamos também uma dica (opcional) para melhorar a resposta.
      const patientContext = buildPatientContextText(patient);
      const enrichedMessage = patientContext
        ? `${trimmed}\n\n[Contexto do paciente]\n${patientContext}`
        : trimmed;

      const res = await aiService.chat({
        message: enrichedMessage,
        history: history
          .concat([
            // incluir o usuário atual para manter consistência
            { role: 'user', content: enrichedMessage },
          ])
          .filter(Boolean),
        patientId: patientIdToSend,
      });

      const reply = (res as { reply?: string; success?: boolean; error?: string }).reply ?? '';
      if (!reply) {
        throw new Error(res?.error || 'Resposta vazia da IA.');
      }

      const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: reply };
      setChat((c) => [...c, assistantMsg]);

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content:
          'Desculpe — não consegui gerar a resposta agora. Tente novamente em alguns segundos. Se persistir, verifique a configuração da IA (OPENAI_API_KEY / Supabase).',
      };
      setChat((c) => [...c, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[24px] font-extrabold text-zinc-50 tracking-tighter leading-none sm:text-[26px]">
              Chatbot IA
            </h2>
            <BackButton to="dashboard" />
          </div>
          <p className="text-[13px] text-zinc-500 mt-2">
            Converse com o assistente do sistema. Selecione um paciente para contexto.
          </p>
        </div>
        <Button className="w-full justify-center sm:w-auto" size="sm" variant="ghost" icon={<Sparkles size={14} />} onClick={() => setOpenHelp(true)}>
          Como usar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px] lg:gap-6">
        <Card className="p-3.5 sm:p-5">
          <div
            ref={listRef}
            className="max-h-[52vh] min-h-[320px] overflow-y-auto space-y-3 pr-1 sm:max-h-[420px] sm:pr-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {chat.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[92%] whitespace-pre-wrap rounded-xl p-2.5 text-[12px] leading-relaxed sm:max-w-[85%] sm:rounded-2xl sm:p-3 sm:text-[13px]"
                  style={{
                    background:
                      m.role === 'user' ? 'rgba(20,184,166,0.14)' : 'rgba(255,255,255,0.04)',
                    border:
                      m.role === 'user'
                        ? '1px solid rgba(20,184,166,0.28)'
                        : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {m.role === 'user' ? (
                      <UserIcon size={14} className="text-teal-300" />
                    ) : (
                      <Bot size={14} className="text-zinc-300" />
                    )}
                    <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      {m.role === 'user' ? 'Você' : 'Assistente'}
                    </span>
                  </div>
                  <div className="text-zinc-200">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="max-w-[92%] rounded-xl p-2.5 text-[12px] leading-relaxed sm:max-w-[85%] sm:rounded-2xl sm:p-3 sm:text-[13px]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-zinc-300" />
                    <span className="text-zinc-200">Gerando resposta…</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-[13px] text-red-200 font-semibold">Erro</p>
              <p className="text-[12px] text-red-100 mt-1">{error}</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem…"
                className="w-full rounded-xl px-3 py-2 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all sm:rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <p className="text-[11px] text-zinc-600 mt-1">
                Enter envia • Shift+Enter quebra linha
              </p>
            </div>

            <Button
              className="w-full justify-center sm:w-auto"
              onClick={() => void send()}
              loading={loading}
              disabled={!message.trim() || loading}
              icon={<Send size={14} />}
            >
              Enviar
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[13px] font-bold text-zinc-200">Contexto do paciente</p>
                <p className="text-[11px] text-zinc-500 mt-1">Opcional — melhora as respostas.</p>
              </div>
              <Bot size={16} className="text-teal-300" />
            </div>

            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Paciente
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[13px] text-zinc-200 outline-none appearance-none sm:rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="">Sem seleção</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#0d0e14' }}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="mt-3">
              <p className="text-[11px] text-zinc-600">
                {patient ? `Usando: ${patient.name}` : 'Sem paciente selecionado.'}
              </p>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <p className="text-[13px] font-bold text-zinc-200">Privacidade</p>
            <p className="text-[12px] text-zinc-600 mt-2 leading-relaxed">
              Este chatbot envia sua mensagem e (quando selecionado) um contexto resumido do paciente para a função de IA.
            </p>
            <p className="text-[11px] text-zinc-600 mt-3">
              Dica: evite dados sensíveis que não sejam necessários.
            </p>
          </Card>

          <Button
            className="w-full justify-center"
            size="sm"
            variant="ghost"
            onClick={() => {
              setChat([
                {
                  id: uid(),
                  role: 'assistant',
                  content:
                    'Conversa limpa. Como posso ajudar agora?',
                },
              ]);
              setError(null);
            }}
          >
            Limpar conversa
          </Button>
        </div>
      </div>

      <Modal
        open={openHelp}
        onClose={() => setOpenHelp(false)}
        title="Como usar o Chatbot IA"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpenHelp(false)}>
              Fechar
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[13px] text-zinc-200">
          <p>
            1) Escreva uma pergunta ou peça orientações (ex.: “Como agendar uma consulta?”, “Como funciona o faturamento?”).
          </p>
          <p>
            2) Se estiver atendendo um paciente, selecione-o na lateral para melhorar o contexto.
          </p>
          <p>
            3) Use Enter para enviar. Shift+Enter para quebrar linha.
          </p>
          <p className="text-[12px] text-zinc-600">
            Observação: respostas podem não substituir avaliação profissional quando a pergunta for médica.
          </p>
        </div>
      </Modal>
    </div>
  );
}
