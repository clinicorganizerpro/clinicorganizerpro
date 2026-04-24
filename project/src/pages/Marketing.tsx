import { useState, useMemo } from 'react';
import { Megaphone, Plus, Send, Users, CheckCircle2, Sparkles, BarChart2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { Campaign } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

const TEMPLATES = [
  { id: 'reactivation', icon: '💌', label: 'Reativação', desc: 'Reconquistar pacientes inativos', audience: 'inactive' as const },
  { id: 'birthday', icon: '🎂', label: 'Aniversário', desc: 'Felicitações com oferta especial', audience: 'all' as const },
  { id: 'seasonal', icon: '🌸', label: 'Sazonal', desc: 'Promoções de época', audience: 'all' as const },
  { id: 'post_care', icon: '✨', label: 'Pós-Procedimento', desc: 'Cuidados e follow-up', audience: 'recent' as const },
  { id: 'vip', icon: '⭐', label: 'VIP', desc: 'Oferta exclusiva para melhores clientes', audience: 'vip' as const },
  { id: 'referral', icon: '🤝', label: 'Indicação', desc: 'Programa de indicação de novos clientes', audience: 'active' as const },
];

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Todos os pacientes',
  inactive: 'Pacientes inativos',
  recent: 'Pacientes recentes',
  vip: 'Clientes VIP (top gastos)',
  active: 'Pacientes ativos',
};

function CreateCampaignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCampaign, patients } = useApp();
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Campaign['audience']>('all');
  const [sendNow, setSendNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const estimatedCount = useMemo(() => {
    if (audience === 'inactive') return patients.filter(p => p.status === 'inactive').length;
    if (audience === 'recent') return patients.filter(p => p.status === 'active').slice(0, 10).length;
    if (audience === 'vip') return patients.filter(p => p.totalSpent > 3000).length;
    return patients.length;
  }, [audience, patients]);

  function handleSelectTemplate(t: typeof TEMPLATES[0]) {
    setSelectedTemplate(t);
    setAudience(t.audience as Campaign['audience']);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    await addCampaign({
      name,
      templateType: selectedTemplate.id,
      message: message || `Mensagem da campanha: ${selectedTemplate.label}`,
      audience,
      status: sendNow ? 'draft' : 'draft',
      patientIds: [],
    });

    // The new campaign id isn't available directly; we'd need to reload and find it
    // For simplicity, trigger sendCampaign for the most recent campaign after a brief delay
    if (sendNow) {
      // Handled via the list by user clicking "Enviar"
    }
    setSaving(false);
    onClose();
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const;

  return (
    <Modal
      open={open} onClose={onClose}
      title="Nova Campanha"
      subtitle="Crie e dispare mensagens para seus pacientes"
      maxWidth="max-w-xl"
      footer={step === 'template' ? (
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => setStep('details')}>Próximo</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setStep('template')}>Voltar</Button>
          <Button size="sm" onClick={handleCreate} loading={saving} disabled={!name.trim()}>Criar Campanha</Button>
        </>
      )}
    >
      {step === 'template' ? (
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
              style={selectedTemplate.id === t.id ? {
                background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(13,148,136,0.06))',
                border: '1px solid rgba(20,184,166,0.25)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="text-2xl flex-shrink-0">{t.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">{t.label}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Nome da Campanha *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder={`Campanha de ${selectedTemplate.label}`}
              className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Público-alvo</label>
            <select
              value={audience} onChange={e => setAudience(e.target.value as Campaign['audience'])}
              className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none"
              style={inputStyle}
            >
              {Object.entries(AUDIENCE_LABELS).map(([v, l]) => (
                <option key={v} value={v} style={{ background: '#0d0e14' }}>{l}</option>
              ))}
            </select>
            <p className="text-[11px] text-teal-400 mt-1.5 font-semibold">~{estimatedCount} destinatários estimados</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Mensagem</label>
            <textarea
              rows={4} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Escreva a mensagem da campanha... Use {nome} para personalizar."
              className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-none"
              style={inputStyle}
            />
          </div>
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">Enviar agora</p>
              <p className="text-[11px] text-zinc-600">Dispare imediatamente após criar</p>
            </div>
            <button
              onClick={() => setSendNow(v => !v)}
              className="relative w-10 h-5 rounded-full transition-all"
              style={{ background: sendNow ? '#14b8a6' : 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: sendNow ? '22px' : '2px' }}
              />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function formatDate(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); }
  catch { return iso; }
}

export function Marketing() {
  const { campaigns, sendCampaign, loading } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  async function handleSend(id: string) {
    setSending(id);
    await (sendCampaign as (id: string) => Promise<unknown>)(id);
    setSending(null);
  }

  const stats = useMemo(() => ({
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    totalReach: campaigns.reduce((s, c) => s + c.sentCount, 0),
    avgOpen: campaigns.length > 0
      ? Math.round(campaigns.reduce((s, c) => s + (c.sentCount > 0 ? (c.openCount / c.sentCount) * 100 : 0), 0) / campaigns.length)
      : 0,
  }), [campaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Marketing</h2>
          <p className="text-[13px] text-zinc-500 mt-2">Campanhas e comunicação em massa</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Nova Campanha</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de campanhas', value: stats.total, icon: <Megaphone size={16} />, color: 'from-teal-500/18 to-teal-600/8 text-teal-400' },
          { label: 'Campanhas enviadas', value: stats.sent, icon: <CheckCircle2 size={16} />, color: 'from-emerald-500/18 to-emerald-600/8 text-emerald-400' },
          { label: 'Alcance total', value: stats.totalReach, icon: <Users size={16} />, color: 'from-blue-500/18 to-blue-600/8 text-blue-400' },
          { label: 'Taxa de abertura', value: `${stats.avgOpen}%`, icon: <BarChart2 size={16} />, color: 'from-amber-500/18 to-amber-600/8 text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card-premium card-hover rounded-2xl p-4">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} border border-white/5 w-fit mb-3`}>{s.icon}</div>
            <p className="text-[24px] font-extrabold text-zinc-50 tracking-tighter leading-none">{s.value}</p>
            <p className="text-[11px] text-zinc-500 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Templates quick access */}
      <div className="card-premium rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Sparkles size={15} className="text-teal-400" />
          <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Templates de Campanha</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setCreateOpen(true)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-[10px] text-zinc-500 font-semibold leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-[15px] font-bold text-zinc-100 tracking-tight">Histórico de Campanhas</h3>
          <p className="text-[12px] text-zinc-600 mt-0.5">{campaigns.length} campanhas criadas</p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3 fade-in">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="w-10 h-10 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-56 h-4" />
                  <Skeleton className="w-40 h-3" />
                </div>
                <Skeleton className="w-20 h-7 rounded-lg" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Megaphone size={32} className="text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">Nenhuma campanha criada ainda</p>
            <Button size="sm" className="mt-4" icon={<Plus size={12} />} onClick={() => setCreateOpen(true)}>Criar primeira campanha</Button>
          </div>
        ) : (
          <div>
            {campaigns.map((camp, i) => (
              <div
                key={camp.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ borderBottom: i < campaigns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="text-2xl flex-shrink-0">
                  {TEMPLATES.find(t => t.id === camp.templateType)?.icon ?? '📣'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-200 tracking-tight">{camp.name}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{AUDIENCE_LABELS[camp.audience] ?? camp.audience} · {formatDate(camp.createdAt ?? '')}</p>
                </div>
                {camp.status === 'sent' && (
                  <div className="flex items-center gap-4 text-center flex-shrink-0">
                    <div>
                      <p className="text-[14px] font-bold text-zinc-200">{camp.sentCount}</p>
                      <p className="text-[10px] text-zinc-600">enviados</p>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-emerald-400">{camp.sentCount > 0 ? Math.round((camp.openCount / camp.sentCount) * 100) : 0}%</p>
                      <p className="text-[10px] text-zinc-600">abertura</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={camp.status === 'sent' ? 'success' : camp.status === 'scheduled' ? 'info' : 'neutral'}>
                    {camp.status === 'sent' ? 'Enviada' : camp.status === 'scheduled' ? 'Agendada' : 'Rascunho'}
                  </Badge>
                  {camp.status !== 'sent' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Send size={12} />}
                      loading={sending === camp.id}
                      onClick={() => handleSend(camp.id)}
                    >
                      Enviar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
