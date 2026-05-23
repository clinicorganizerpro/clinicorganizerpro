import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, User as UserIcon } from 'lucide-react';
import aiService, { type ChatHistoryItem } from '../../services/aiService';
import { useApp } from '../../context/useApp';
import type { Patient } from '../../types';
import { Button } from '../ui/Button';

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

export function FloatingChatbot() {
  const { patients } = useApp() as unknown as { patients: Patient[] };

  const [open, setOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: 'assistant',
      content:
        'Olá! Sou o assistente do Clinic Organizer Pro. Posso ajudar com agendamentos, faturamento, automações e dúvidas gerais.',
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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (!panelRef.current) return;
      if (panelRef.current.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

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
      const patientContext = buildPatientContextText(patient);
      const enrichedMessage = patientContext
        ? `${trimmed}\n\n[Contexto do paciente]\n${patientContext}`
        : trimmed;

      const res = await aiService.chat({
        message: enrichedMessage,
        history: history
          .concat([{ role: 'user', content: enrichedMessage }])
          .filter(Boolean),
        patientId: patientIdToSend,
      });

      const reply = (res as { reply?: string; success?: boolean; error?: string }).reply ?? '';
      if (!reply) throw new Error((res as { error?: string })?.error || 'Resposta vazia da IA.');

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
          'Desculpe — não consegui gerar a resposta agora. Tente novamente em alguns segundos.',
      };
      setChat((c) => [...c, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'auto' });
    });
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-transparent"
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed z-[101] ${open ? 'inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5' : 'bottom-5 right-5'} flex items-end gap-3`}
        aria-label="Chatbot"
      >
      {open && (
        <div
          ref={panelRef}
          className="flex max-h-[calc(100dvh-5.5rem)] w-full max-w-none flex-col overflow-hidden rounded-2xl p-0 backdrop-blur-md sm:w-[360px] sm:max-w-[calc(100vw-2rem)]"
          style={{
            background: 'rgba(10, 10, 15, 0.45)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
            <div className="flex shrink-0 items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'rgba(20,184,166,0.15)',
                    border: '1px solid rgba(20,184,166,0.35)',
                  }}
                >
                  <Bot size={16} className="text-teal-300" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-extrabold text-zinc-50 leading-tight">
                    Chatbot IA
                  </div>
                  <div className="truncate text-[11px] text-zinc-500 leading-tight">Assistente do sistema</div>
                </div>
              </div>

              <Button className="shrink-0" size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar chatbot">
                Fechar
              </Button>
            </div>

            <div
              ref={listRef}
              className="min-h-[220px] flex-1 overflow-y-auto space-y-3 px-3 pb-3 sm:max-h-[320px]"
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

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-[13px] text-red-200 font-semibold">Erro</p>
                  <p className="text-[12px] text-red-100 mt-1">{error}</p>
                </div>
              )}
            </div>

            <div className="shrink-0 px-3 pb-3">
              <div className="mb-2">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Paciente (opcional)
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-[13px] text-zinc-200 outline-none appearance-none sm:rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <option value="">Sem seleção</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} style={{ background: '#0d0e14' }}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                  <p className="text-[11px] text-zinc-600 mt-1">Enter envia • Shift+Enter quebra linha</p>
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
            </div>
          </div>
        )}

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              background: 'rgba(20,184,166,0.16)',
              border: '1px solid rgba(20,184,166,0.45)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
            }}
            aria-label="Abrir chatbot"
          >
            <Bot size={18} className="text-teal-300" />
          </button>
        )}
      </div>
    </>
  );
}
