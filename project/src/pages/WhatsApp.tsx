import { useState, useMemo } from 'react';
import { MessageCircle, Send, CheckCircle2, Clock, XCircle, Plus, Zap } from 'lucide-react';
import { useApp } from '../context/useApp';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

function formatTime(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

const TEMPLATES = [
  {
    id: 'confirmation',
    label: 'Confirmação de Consulta',
    icon: '📅',
    body: 'Olá {nome}! Sua consulta está confirmada para {data} às {horario}. Caso precise remarcar, entre em contato. Clínica Estética.',
  },
  {
    id: 'reminder_24h',
    label: 'Lembrete 24h',
    icon: '⏰',
    body: 'Oi {nome}! Lembrando que sua consulta é amanhã às {horario}. Estamos aguardando você! Clínica Estética.',
  },
  {
    id: 'reactivation',
    label: 'Reativação',
    icon: '💌',
    body: 'Oi {nome}, sentimos sua falta! Faz tempo que não te vemos. Que tal agendar um horário? Temos novidades incríveis esperando por você!',
  },
  {
    id: 'birthday',
    label: 'Aniversário',
    icon: '🎂',
    body: 'Feliz aniversário, {nome}! 🎉 Para celebrar, preparamos um desconto especial para você. Entre em contato e agende seu procedimento!',
  },
  {
    id: 'post_care',
    label: 'Pós-Procedimento',
    icon: '✨',
    body: 'Oi {nome}! Como está se sentindo após o procedimento? Lembre-se dos cuidados: {instrucoes}. Qualquer dúvida, estamos aqui!',
  },
];

function SendMessageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { patients, sendMessage } = useApp();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<'template' | 'patients'>('template');

  const messageBody = customMessage || selectedTemplate.body;

  function togglePatient(id: string) {
    setSelectedPatients(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function selectAll() {
    setSelectedPatients(patients.map(p => p.id));
  }

  async function handleSend() {
    if (selectedPatients.length === 0) return;
    setSending(true);
    for (const pid of selectedPatients) {
      const p = patients.find(p => p.id === pid);
      if (!p) continue;
      const msg = messageBody.replace('{nome}', p.name).replace('{data}', '').replace('{horario}', '');
      await (sendMessage as (payload: { patientId: string; patientName: string; message: string; templateType: string; status: 'sent' }) => Promise<unknown>)({ patientId: pid, patientName: p.name, message: msg, templateType: selectedTemplate.id, status: 'sent' });
    }
    setSending(false);
    onClose();
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Enviar Mensagem"
      subtitle="Selecione um template e os destinatários"
      maxWidth="max-w-xl"
      footer={step === 'template' ? (
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => setStep('patients')}>Selecionar Pacientes</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setStep('template')}>Voltar</Button>
          <Button size="sm" icon={<Send size={13} />} onClick={handleSend} loading={sending} disabled={selectedPatients.length === 0}>
            Enviar para {selectedPatients.length} paciente{selectedPatients.length !== 1 ? 's' : ''}
          </Button>
        </>
      )}
    >
      {step === 'template' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                style={selectedTemplate.id === t.id ? {
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(13,148,136,0.06))',
                  border: '1px solid rgba(20,184,166,0.25)',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-xl flex-shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-200">{t.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{t.body}</p>
                </div>
                {selectedTemplate.id === t.id && <CheckCircle2 size={15} className="text-teal-400 flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Mensagem personalizada (opcional)</label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder={selectedTemplate.body}
              className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-700 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-500">{selectedPatients.length} selecionados</p>
            <button onClick={selectAll} className="text-[12px] text-teal-400 hover:text-teal-300 font-semibold transition-colors">Selecionar todos</button>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => togglePatient(p.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left"
                style={selectedPatients.includes(p.id) ? {
                  background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)',
                } : {
                  background: 'rgba(255,255,255,0.02)', border: '1px solid transparent',
                }}
              >
                <Avatar name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-200 truncate">{p.name}</p>
                  <p className="text-[11px] text-zinc-600">{p.phone || p.email || '—'}</p>
                </div>
                {selectedPatients.includes(p.id) && <CheckCircle2 size={14} className="text-teal-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function WhatsApp() {
  const { messages, loading } = useApp();
  const [sendOpen, setSendOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');

  const filtered = useMemo(() => {
    return filterStatus === 'all' ? messages : messages.filter(m => m.status === filterStatus);
  }, [messages, filterStatus]);

  const stats = useMemo(() => ({
    total: messages.length,
    sent: messages.filter(m => m.status === 'sent').length,
    pending: messages.filter(m => m.status === 'pending').length,
    failed: messages.filter(m => m.status === 'failed').length,
  }), [messages]);

  const statusIcon = {
    sent: <CheckCircle2 size={13} className="text-emerald-400" />,
    pending: <Clock size={13} className="text-amber-400" />,
    failed: <XCircle size={13} className="text-red-400" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">WhatsApp</h2>
          <p className="text-[13px] text-zinc-500 mt-2">Mensagens automáticas e comunicação com pacientes</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setSendOpen(true)}>Nova Mensagem</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total enviadas', value: stats.total, icon: <MessageCircle size={16} />, color: 'from-teal-500/18 to-teal-600/8 text-teal-400' },
          { label: 'Entregues', value: stats.sent, icon: <CheckCircle2 size={16} />, color: 'from-emerald-500/18 to-emerald-600/8 text-emerald-400' },
          { label: 'Pendentes', value: stats.pending, icon: <Clock size={16} />, color: 'from-amber-500/18 to-amber-600/8 text-amber-400' },
          { label: 'Falhas', value: stats.failed, icon: <XCircle size={16} />, color: 'from-red-500/18 to-red-600/8 text-red-400' },
        ].map(s => (
          <div key={s.label} className="card-premium card-hover rounded-2xl p-4">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} border border-white/5 w-fit mb-3`}>{s.icon}</div>
            <p className="text-[24px] font-extrabold text-zinc-50 tracking-tighter leading-none">{s.value}</p>
            <p className="text-[11px] text-zinc-500 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Templates quick-send */}
      <div className="card-premium rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Templates Rápidos</h3>
            <p className="text-[12px] text-zinc-600 mt-0.5">Envie mensagens predefinidas com um clique</p>
          </div>
          <Zap size={16} className="text-amber-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSendOpen(true)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-[11px] text-zinc-400 font-medium leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages log */}
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Histórico de Mensagens</h3>
            <p className="text-[12px] text-zinc-600 mt-0.5">{filtered.length} registros</p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['all', 'sent', 'pending', 'failed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={filterStatus === f ? {
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.08))',
                  border: '1px solid rgba(20,184,166,0.25)', color: '#5eead4',
                } : { color: '#52525b' }}
              >
                {f === 'all' ? 'Todos' : f === 'sent' ? 'Entregue' : f === 'pending' ? 'Pendente' : 'Falha'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3 fade-in">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-full max-w-md h-3" />
                </div>
                <Skeleton className="w-24 h-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <MessageCircle size={32} className="text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">Nenhuma mensagem enviada ainda</p>
            <p className="text-[12px] text-zinc-700 mt-1">Clique em "Nova Mensagem" para começar</p>
          </div>
        ) : (
          <div>
            {filtered.map((msg, i) => (
              <div
                key={msg.id}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar name={msg.patientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-200 tracking-tight">{msg.patientName}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{msg.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusIcon[msg.status]}
                  <span className="text-[11px] text-zinc-600">{formatTime(msg.sentAt ?? msg.createdAt ?? '')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SendMessageModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
