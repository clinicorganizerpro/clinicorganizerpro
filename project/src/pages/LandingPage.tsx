import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, GlassWater, HeartPulse, LandPlot, LineChart, Sparkles, Upload, Users, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import logo from '../assets/clinic-organizer-pro-logo.svg';
import { loadAdminData, type AdminPlan } from '../lib/adminStore';

type LandingProps = {
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  signUpButtonLabel?: string;
  signInButtonLabel?: string;
};

function GlowBadge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/7 bg-white/3 px-3 py-1.5 text-[12px] font-semibold text-zinc-200 shadow-[0_0_26px_rgba(20,184,166,0.12)]">
      {icon ? <span className="inline-flex">{icon}</span> : null}
      {children}
    </div>
  );
}

function SectionTitle({ kicker, title, desc }: { kicker?: string; title: string; desc?: string }) {
  return (
    <div className="space-y-3">
      {kicker ? (
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-400/90">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-[34px] leading-[1.05] md:text-[42px] font-extrabold tracking-tighter text-zinc-50">
        {title}
      </h2>
      {desc ? <p className="text-[14px] md:text-[15px] text-zinc-400 max-w-[760px]">{desc}</p> : null}
    </div>
  );
}

function PremiumCard({
  children,
  className = '',
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card-premium rounded-3xl p-5 layer-surface layer-elevated ${hover ? 'card-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 shadow-[0_0_18px_rgba(20,184,166,0.14)]">
      <span className="absolute inset-0 rounded-2xl bg-teal-400/10 blur-[10px]" />
      <span className="relative text-teal-300">{children}</span>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/3 p-4 transition-all hover:scale-[1.02] hover:border-white/12">
      <div className="flex items-start gap-4">
        <FeatureIcon>{icon}</FeatureIcon>
        <div className="space-y-2">
          <p className="text-[14px] font-bold tracking-tight text-zinc-50">{title}</p>
          <p className="text-[12px] leading-5 text-zinc-500">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-premium rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.10)]">
          <Sparkles size={18} className="text-teal-300" />
        </div>
        <div>
          <p className="text-[26px] font-extrabold tracking-tighter text-zinc-50 leading-none">{value}</p>
          <p className="text-[12px] mt-2 text-zinc-500 font-semibold">{label}</p>
        </div>
      </div>
    </div>
  );
}

function MockupDashboard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[40px] bg-gradient-radial from-cyan-400/10 via-emerald-400/10 to-transparent blur-3xl" />
      <div className="rounded-[40px] border border-white/10 bg-white/3 backdrop-blur-xl shadow-[0_0_80px_rgba(20,184,166,0.10)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-white/4 border border-white/10 flex items-center justify-center">
              <GlassWater size={16} className="text-teal-300" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-zinc-50 leading-none">Clinic Organizer</p>
              <p className="text-[11px] text-zinc-500 mt-1">Dashboard • Multi-clínica</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlowBadge icon={<span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_14px_rgba(20,184,166,0.6)]" />}>
              Live métricas
            </GlowBadge>
          </div>
        </div>

        <div className="p-5 grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <div className="col-span-3 hidden lg:block">
            <div className="h-full rounded-3xl border border-white/8 bg-white/2 p-3">
              {['Agenda', 'Pacientes', 'Financeiro', 'Relatórios', 'Configurações'].map((t, i) => (
                <div
                  key={t}
                  className={`row-interactive flex items-center gap-3 px-3 py-2.5 mb-2 ${
                    i === 0 ? 'sidebar-item-active' : 'bg-transparent'
                  }`}
                >
                  <div className="h-8 w-8 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center">
                    <span className="text-teal-300">{i === 0 ? <CalendarDays size={14} /> : i === 1 ? <Users size={14} /> : i === 2 ? <Wallet size={14} /> : i === 3 ? <LineChart size={14} /> : <ClipboardCheck size={14} />}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-zinc-200 whitespace-nowrap">{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="col-span-12 lg:col-span-9">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Agenda inteligente</p>
                  <p className="text-[18px] font-extrabold tracking-tighter text-zinc-50 mt-2">Próximos atendimentos</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { t: '09:30', a: 'Avaliação facial', s: 'Teal' },
                      { t: '11:00', a: 'Pós-procedimento', s: 'Cyan' },
                      { t: '14:20', a: 'Consulta médica', s: 'Violet' },
                    ].map((r) => (
                      <div key={r.t} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                        <div>
                          <p className="text-[12px] font-bold text-zinc-50">{r.t}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">{r.a}</p>
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full bg-teal-300 shadow-[0_0_16px_rgba(20,184,166,0.55)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Financeiro</p>
                  <p className="text-[18px] font-extrabold tracking-tighter text-zinc-50 mt-2">Métricas em tempo real</p>
                  <div className="mt-4">
                    <div className="flex items-end gap-2 h-28">
                      {[30, 52, 38, 64, 46, 72].map((h, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-xl bg-white/4 border border-white/8 relative"
                          style={{ height: `${h}%` }}
                        >
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-xl"
                            style={{
                              height: `${h}%`,
                              background: idx % 2 === 0 ? 'rgba(20,184,166,0.22)' : 'rgba(59,130,246,0.18)',
                              boxShadow: idx % 2 === 0 ? '0 0 18px rgba(20,184,166,0.22)' : '0 0 18px rgba(59,130,246,0.20)',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[12px] font-bold text-zinc-50">$ 18.420</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Recebido</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                        <p className="text-[12px] font-bold text-zinc-50">+12%</p>
                        <p className="text-[11px] text-zinc-500 mt-1">vs. mês</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 mt-1">
                <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Pacientes</p>
                      <p className="text-[18px] font-extrabold tracking-tighter text-zinc-50 mt-2">Prontuário eletrônico</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-9 w-9 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center">
                        <HeartPulse size={16} className="text-teal-300" />
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center">
                        <Upload size={16} className="text-teal-300" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-white/2">
                    <div className="grid grid-cols-12 px-4 py-3 bg-white/3 border-b border-white/8 text-[11px] text-zinc-500 font-semibold">
                      <div className="col-span-4">Paciente</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-2">Última visita</div>
                      <div className="col-span-3 text-right">Ações</div>
                    </div>
                    {[
                      { n: 'Mariana S.', st: 'Ativo', d: 'há 12 dias' },
                      { n: 'João P.', st: 'VIP', d: 'há 6 dias' },
                      { n: 'Carla R.', st: 'Recente', d: 'hoje' },
                    ].map((row, i) => (
                      <div key={row.n} className="grid grid-cols-12 px-4 py-3 text-[12px] text-zinc-200" style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="col-span-4 font-semibold">{row.n}</div>
                        <div className="col-span-3">
                          <span className="inline-flex rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-[11px] text-zinc-300">{row.st}</span>
                        </div>
                        <div className="col-span-2 text-zinc-500">{row.d}</div>
                        <div className="col-span-3 text-right">
                          <button className="text-teal-300 font-semibold hover:text-teal-200 transition">Abrir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block absolute -left-10 -top-10 w-28 h-28 rounded-full bg-teal-300/10 blur-2xl" />
      <div className="hidden md:block absolute -right-10 -bottom-12 w-32 h-32 rounded-full bg-cyan-300/10 blur-2xl" />
    </div>
  );
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function LandingPage({ onPrimaryAction, onSecondaryAction, signUpButtonLabel = 'Criar Conta Grátis', signInButtonLabel = 'Acessar Sistema' }: LandingProps) {
  const plansForLanding: AdminPlan[] = useMemo(() => {
    const adminData = loadAdminData();
    return adminData.plans.filter((p) => p.active);
  }, []);
  const features = useMemo(
    () => [
      { icon: <CalendarDays size={18} />, title: 'Agenda Inteligente', desc: 'Reduza faltas com lembretes e fluxo automático de atendimento.' },
      { icon: <Wallet size={18} />, title: 'Gestão Financeira', desc: 'Entradas, saídas e visão clara do desempenho do seu caixa.' },
      { icon: <ClipboardCheck size={18} />, title: 'Prontuário Eletrônico', desc: 'Histórico, anotações e documentos em um lugar só.' },
      { icon: <Sparkles size={18} />, title: 'Anamnese Digital', desc: 'Padronize avaliações e mantenha dados organizados.' },
      { icon: <LandPlot size={18} />, title: 'Controle de Estoque', desc: 'Gerencie insumos e evite desperdícios com alertas.' },
      { icon: <Users size={18} />, title: 'Gestão de Profissionais', desc: 'Permissões e organização por equipe e clínica.' },
      { icon: <GlassWater size={18} />, title: 'Automação WhatsApp', desc: 'Mensagens inteligentes e acompanhamento pós-atendimento.' },
      { icon: <LineChart size={18} />, title: 'Relatórios & Analytics', desc: 'Métricas acionáveis para tomar decisões rápidas.' },
      { icon: <Users size={18} />, title: 'Multi Usuários', desc: 'Colabore com sua equipe com segurança e controle.' },
      { icon: <Upload size={18} />, title: 'Upload de Exames', desc: 'Armazene arquivos e conecte ao prontuário do paciente.' },
    ],
    [],
  );

  const badges = useMemo(
    () => [
      { label: '100% online', icon: <span className="h-1.5 w-1.5 rounded-full bg-teal-400 inline-block shadow-[0_0_16px_rgba(20,184,166,0.6)]" /> },
      { label: 'Multi clínica', icon: <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 inline-block shadow-[0_0_16px_rgba(59,130,246,0.55)]" /> },
      { label: 'Prontuário eletrônico', icon: <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 inline-block shadow-[0_0_16px_rgba(16,185,129,0.55)]" /> },
      { label: 'LGPD Ready', icon: <span className="h-1.5 w-1.5 rounded-full bg-white/60 inline-block" /> },
    ],
    [],
  );

  const [mobileCtaOpen, setMobileCtaOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Background mesh */}
      <div className="app-background-logo" aria-hidden="true">
        <img className="app-background-logo__image" src={logo} alt="" />
      </div>

      {/* Top gradient glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px]">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[500px] rounded-full bg-teal-400/8 blur-3xl" />
        <div className="absolute top-10 left-0 w-[520px] h-[420px] rounded-full bg-teal-300/5 blur-3xl" />
        <div className="absolute top-10 right-0 w-[520px] h-[420px] rounded-full bg-emerald-300/5 blur-3xl" />
      </div>

      <header className="relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center shadow-[0_0_26px_rgba(20,184,166,0.14)]">
                <img src={logo} alt="Clinic Organizer Pro" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold tracking-tight text-zinc-50 leading-none">
                  Clinic Organizer Pro
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">SaaS para clínicas com inteligência</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              {['Recursos', 'Dashboard', 'Planos', 'Sobre'].map((t) => (
                <a key={t} href="#recursos" className="text-[13px] text-zinc-400 hover:text-zinc-200 transition">
                  {t}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="secondary" onClick={onSecondaryAction}>
                Acessar
              </Button>
              <Button className="btn-primary-premium" onClick={onPrimaryAction}>
                Criar Conta
                <span className="ml-2 inline-flex">
                  <ArrowRight size={14} />
                </span>
              </Button>
            </div>

            <div className="lg:hidden">
              <button
                onClick={() => setMobileCtaOpen((v) => !v)}
                className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2 text-[13px] font-semibold text-zinc-200 hover:bg-white/5 transition"
              >
                {mobileCtaOpen ? 'Fechar' : 'Ações'}
              </button>
            </div>
          </div>

          {mobileCtaOpen ? (
            <div className="lg:hidden mt-4 card-premium rounded-3xl p-3 border border-white/8">
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onSecondaryAction}>
                  {signInButtonLabel}
                </Button>
                <Button className="btn-primary-premium" onClick={onPrimaryAction}>
                  {signUpButtonLabel}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-8 md:pt-16 pb-12 md:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  {badges.map((b) => (
                    <GlowBadge key={b.label} icon={b.icon}>
                      {b.label}
                    </GlowBadge>
                  ))}
                </div>

                <div className="space-y-4">
                  <h1 className="text-[40px] md:text-[56px] leading-[1.0] font-extrabold tracking-tighter text-zinc-50">
                    Gerencie sua clínica com inteligência e elegância.
                  </h1>
                  <p className="text-[14px] md:text-[16px] text-zinc-400 max-w-[620px] leading-6">
                    Sistema completo para clínicas estéticas, médicas e consultórios com agenda inteligente, prontuário eletrônico,
                    financeiro, anamnese, automações e gestão completa.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="btn-primary-premium" onClick={onPrimaryAction}>
                    {signUpButtonLabel}
                    <span className="ml-2 inline-flex">
                      <ArrowRight size={14} />
                    </span>
                  </Button>
                  <Button variant="secondary" onClick={onSecondaryAction}>
                    {signInButtonLabel}
                  </Button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center">
                      <span className="pulse-dot text-teal-300">●</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-200">Pronto para começar em minutos</p>
                      <p className="text-[12px] text-zinc-500 mt-1">Crie, configure e já agende.</p>
                    </div>
                  </div>
                </div>

                {/* Fotos do sistema (preview no topo) */}
                <div className="pt-4">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    Fotos do sistema
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
                      <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                        <img src="/landing/dashboard.svg" alt="Dashboard" className="h-[110px] w-full object-cover" loading="lazy" />
                      </div>
                      <p className="mt-2 text-[12px] font-bold text-zinc-50">Dashboard</p>
                    </div>

                    <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
                      <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                        <img src="/landing/agenda.svg" alt="Agenda" className="h-[110px] w-full object-cover" loading="lazy" />
                      </div>
                      <p className="mt-2 text-[12px] font-bold text-zinc-50">Agenda</p>
                    </div>

                    <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
                      <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                        <img src="/landing/prontuario.svg" alt="Prontuário" className="h-[110px] w-full object-cover" loading="lazy" />
                      </div>
                      <p className="mt-2 text-[12px] font-bold text-zinc-50">Prontuário</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative">
                <div className="hidden lg:block absolute -inset-5 rounded-[50px] bg-gradient-radial from-emerald-400/10 via-cyan-400/8 to-transparent blur-2xl" />
                <MockupDashboard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="relative z-10 pb-6">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="py-6 md:py-12">
            <SectionTitle
              kicker="Recursos premium"
              title="Tudo o que sua clínica precisa, em um só lugar."
              desc="Agenda, prontuário, financeiro, anamnese digital, automações e relatórios."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {features.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="relative z-10 pt-6 md:pt-12 pb-10 md:pb-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="py-6 md:py-12">
            <SectionTitle
              kicker="Planos"
              title="Escolha o plano certo para o seu ritmo"
              desc="Valores mensais prontos para contratar. Você pode começar pelo essencial e evoluir quando precisar."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/*
              Planos vêm do seu AdminData (loadAdminData) — valores reais:
              Essencial: R$ 29,90
              Profissional: R$ 79,90
              Clínica Pro: R$ 199,90
            */}
            {plansForLanding.map((plan, idx) => (
              <div
                key={plan.id}
                className={`rounded-3xl border border-white/8 bg-white/2 p-5 layer-surface layer-elevated ${
                  idx === 1 ? 'card-hover' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-500">Plano</p>
                    <h3 className="mt-2 text-[22px] font-extrabold tracking-tighter text-zinc-50 leading-tight">{plan.name}</h3>
                  </div>

                  {idx === 1 ? (
                    <div className="rounded-full border border-white/10 bg-white/3 px-3 py-1 text-[12px] font-bold text-teal-300">
                      Mais popular
                    </div>
                  ) : null}
                </div>

                <p className="mt-3 text-[13px] leading-6 text-zinc-400">{plan.description}</p>

                <div className="mt-5 flex items-end gap-2">
                  <p className="text-[34px] font-extrabold tracking-tighter text-zinc-50 leading-none">
                    {formatBRL(plan.monthlyPrice)}
                  </p>
                  <p className="text-[13px] font-semibold text-zinc-500 mb-1">/mês</p>
                </div>

                <ul className="mt-5 space-y-2">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-zinc-200">
                      <span className="mt-[3px] h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(20,184,166,0.55)]" />
                      <span className="leading-5">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button className="w-full btn-primary-premium" onClick={onPrimaryAction}>
                    Contratar {plan.name}
                    <span className="ml-2 inline-flex">
                      <ArrowRight size={14} />
                    </span>
                  </Button>
                  <p className="mt-2 text-[12px] text-zinc-500">
                    Sem complicação no início • 100% online
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOTOS DO SISTEMA */}
      <section id="fotos" className="relative z-10 pt-6 md:pt-12 pb-10 md:pb-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="py-6 md:py-12">
            <SectionTitle
              kicker="Fotos reais"
              title="Veja o sistema funcionando na prática"
              desc="Substitua as imagens abaixo pelos seus prints reais (dashboard, agenda e prontuário)."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
              <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                  <img
                  src="/landing/dashboard.svg"
                  alt="Dashboard"
                  className="h-[240px] w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-[13px] font-bold text-zinc-50">Dashboard</p>
              <p className="text-[12px] text-zinc-500 mt-1">Visão geral e métricas do dia.</p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
              <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                  <img
                  src="/landing/agenda.svg"
                  alt="Agenda"
                  className="h-[240px] w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-[13px] font-bold text-zinc-50">Agenda</p>
              <p className="text-[12px] text-zinc-500 mt-1">Atendimentos organizados e sem faltas.</p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/2 p-3 layer-surface layer-elevated overflow-hidden">
              <div className="rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
                  <img
                  src="/landing/prontuario.svg"
                  alt="Prontuário"
                  className="h-[240px] w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-[13px] font-bold text-zinc-50">Prontuário</p>
              <p className="text-[12px] text-zinc-500 mt-1">Histórico, anotações e documentos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section className="relative z-10 pt-6 md:pt-12 pb-10 md:pb-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6">
              <SectionTitle
                kicker="Showcase"
                title="Interface futurista com glow neon sutil."
                desc="Um dashboard claro para agendar atendimentos, acompanhar pacientes e controlar o financeiro — tudo com design pensado para conversão e confiança."
              />
              <div className="space-y-3">
                {[
                  { icon: <CalendarDays size={16} />, t: 'Calendário moderno', d: 'Visão do dia, semana e agenda inteligente.' },
                  { icon: <Users size={16} />, t: 'Tabela de pacientes', d: 'Status, histórico e ações rápidas.' },
                  { icon: <ClipboardCheck size={16} />, t: 'Prontuário eletrônico', d: 'Anexos, notas e acompanhamento.' },
                ].map((row) => (
                  <div key={row.t} className="flex items-start gap-3 rounded-3xl border border-white/8 bg-white/2 p-4">
                    <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.12)] text-teal-300">
                      {row.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-zinc-50">{row.t}</p>
                      <p className="text-[12px] text-zinc-500 mt-1 leading-5">{row.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <PremiumCard className="p-0 overflow-hidden" hover={false}>
                <div className="p-5 border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center">
                      <LineChart size={18} className="text-teal-300" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-50">Métricas e Analytics</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Neon glow sutil + gráficos animados</p>
                    </div>
                  </div>
                  <GlowBadge icon={<Sparkles size={14} className="text-teal-200" />}>Atualização automática</GlowBadge>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Atendimentos</p>
                      <p className="text-[26px] font-extrabold tracking-tighter text-zinc-50 mt-2">+10 mil</p>
                      <p className="text-[12px] text-zinc-500 mt-2">Organize e acompanhe tudo</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Clínicas</p>
                      <p className="text-[26px] font-extrabold tracking-tighter text-zinc-50 mt-2">+500</p>
                      <p className="text-[12px] text-zinc-500 mt-2">Multi-clínica com segurança</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/2 p-4">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Uptime</p>
                      <p className="text-[26px] font-extrabold tracking-tighter text-zinc-50 mt-2">99.9%</p>
                      <p className="text-[12px] text-zinc-500 mt-2">Operação confiável</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/8 bg-white/2 p-4 overflow-hidden">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Relatório de performance</p>
                        <p className="text-[18px] font-extrabold tracking-tighter text-zinc-50 mt-2">Semana em destaque</p>
                      </div>
                      <div className="hidden sm:flex gap-2">
                        <div className="h-9 px-3 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center text-[12px] font-semibold text-zinc-200">
                          Teal
                        </div>
                        <div className="h-9 px-3 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center text-[12px] font-semibold text-zinc-200">
                          Cyan
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-44 flex items-end gap-3">
                      {[12, 26, 18, 38, 30, 52, 46, 64, 58, 72].map((h, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-2xl border border-white/8 bg-white/3 relative"
                          style={{ height: `${h}%` }}
                        >
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-2xl"
                            style={{
                              height: '100%',
                              background: idx % 3 === 0 ? 'rgba(20,184,166,0.22)' : 'rgba(59,130,246,0.18)',
                              boxShadow: idx % 3 === 0 ? '0 0 18px rgba(20,184,166,0.22)' : '0 0 18px rgba(59,130,246,0.20)',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
                      <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="relative z-10 pb-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="py-6 md:py-12">
            <SectionTitle
              kicker="Benefícios"
              title="Mais eficiência. Mais controle. Mais confiança."
              desc="Infraestrutura e design para operação contínua — do agendamento ao prontuário, com segurança e automação."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard value="+10 mil" label="Atendimentos organizados" />
            <StatCard value="+500" label="Clínicas adotaram" />
            <StatCard value="99.9%" label="Uptime e estabilidade" />
            <StatCard value="Automático" label="Backups e resiliência" />
            <StatCard value="LGPD+" label="Segurança avançada" />
            <StatCard value="Multi" label="Multi usuários & multi clínica" />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12 md:pb-16">
          <div className="rounded-[40px] border border-white/10 bg-white/3 backdrop-blur-xl p-6 md:p-10 overflow-hidden relative layer-surface">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-teal-400/10 blur-3xl" />
            <div className="absolute -bottom-36 right-10 w-[520px] h-[420px] rounded-full bg-cyan-400/7 blur-3xl" />
            <div className="relative">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <h3 className="text-[30px] md:text-[44px] font-extrabold tracking-tighter text-zinc-50 leading-[1.02]">
                    Transforme sua clínica em uma operação inteligente.
                  </h3>
                  <p className="text-[14px] md:text-[16px] text-zinc-400 max-w-[680px] leading-6">
                    Comece com uma experiência premium de gestão clínica — com automações, prontuário eletrônico e analytics prontos para crescer.
                  </p>

                  <div className="rounded-3xl border border-white/10 bg-white/3 p-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onPrimaryAction}
                        className="flex-1 rounded-2xl bg-teal-600 text-white px-4 py-3 text-sm font-semibold shadow-[0_12px_30px_rgba(13,148,136,0.25)] border border-teal-700 hover:bg-teal-700 transition"
                      >
                        Criar conta
                      </button>
                      <button
                        type="button"
                        onClick={onSecondaryAction}
                        className="flex-1 rounded-2xl bg-white/0 text-zinc-50 px-4 py-3 text-sm font-semibold border border-white/10 hover:bg-white/5 transition"
                      >
                        Acessar conta
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: <Sparkles size={16} />, label: 'Onboarding rápido' },
                      { icon: <ClipboardCheck size={16} />, label: 'Prontuário completo' },
                      { icon: <CalendarDays size={16} />, label: 'Agenda inteligente' },
                      { icon: <LineChart size={16} />, label: 'Analytics acionável' },
                    ].map((it) => (
                      <div key={it.label} className="rounded-3xl border border-white/8 bg-white/2 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center text-teal-300">
                            {it.icon}
                          </div>
                          <p className="text-[12px] font-bold text-zinc-200 leading-4">{it.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[12px] text-zinc-500">
                    Sem cartão no início • Cancelamento simples • 100% online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/8 bg-black/20 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8 justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center">
                  <img src={logo} alt="Clinic Organizer Pro" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[14px] font-extrabold text-zinc-50 tracking-tight">Clinic Organizer Pro</p>
                  <p className="text-[12px] text-zinc-500 mt-1">Gerenciamento inteligente para clínicas</p>
                </div>
              </div>
              <p className="text-[12px] text-zinc-500 max-w-[420px] leading-5">
                Visual premium, UX moderna e gestão completa — do agendamento ao prontuário eletrônico.
              </p>
              <div className="flex items-center gap-3">
                {['X', 'Instagram', 'LinkedIn'].map((s) => (
                  <a key={s} href="#" className="text-[12px] text-teal-300 hover:text-teal-200 transition font-semibold">
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Produto</p>
                {['Recursos', 'Dashboard', 'Planos', 'Sobre'].map((t) => (
                  <a key={t} href="#recursos" className="block text-[12px] text-zinc-400 hover:text-zinc-200 transition">
                    {t}
                  </a>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Legal</p>
                {['Termos', 'Política de Privacidade', 'LGPD', 'Suporte'].map((t) => (
                  <a key={t} href="#cta" className="block text-[12px] text-zinc-400 hover:text-zinc-200 transition">
                    {t}
                  </a>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">Apoio</p>
                {['Suporte', 'Contato', 'Central de Ajuda'].map((t) => (
                  <a key={t} href="#cta" className="block text-[12px] text-zinc-400 hover:text-zinc-200 transition">
                    {t}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/8 pt-6">
            <p className="text-[12px] text-zinc-500">© {new Date().getFullYear()} Clinic Organizer Pro. Todos os direitos reservados.</p>
            <div className="text-[12px] text-zinc-500">Feito para clínicas estéticas, médicas e consultórios.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
