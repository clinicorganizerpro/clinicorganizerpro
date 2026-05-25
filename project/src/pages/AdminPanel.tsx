import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  fetchTableRows,
  insertRow as insertSupabaseRow,
  deleteRow as deleteSupabaseRow,
} from '../services/supabaseAdminService';
import {
  BarChart3,
  Database,
  Layers3,
  Link2,
  LogOut,
  MessageCircle,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  CircleUserRound,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/useApp';
import type { AppContextType } from '../context/AppContext';
import type { AdminClinic, AdminIntegrationSettings, AdminPlan } from '../lib/adminStore';
import { apiRequest } from '../lib/api';

type AdminTab = 'usuarios' | 'planos' | 'relatorios' | 'integracoes' | 'dados-gerais' | 'sincronizacao';

type SupabaseRow = Record<string, unknown> & {
  id?: string | number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function parseFeatureList(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '0').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{children}</span>;
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/10'
          : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-white/5 bg-white/5 p-4"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-50">{value}</p>
        </div>
        <div className="rounded-2xl border border-teal-500/15 bg-teal-500/10 p-3 text-teal-400">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{hint}</p>
    </div>
  );
}

export default function AdminPanel() {
  const {
    adminSession,
    adminData,
    refreshAdminData,
    integrationSettings,
    updateIntegrationSettings,
    updateClinicProfile,
    updateAdminPlan,
    addAdminPlan,
    addAdminClinic,
    updateAdminClinic,
    deleteAdminClinic,
    updateAdminLogin,
    addAdminLogin,
    deleteAdminLogin,
    signOut,
    showToast,
  } = useApp() as AppContextType;
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');
  const [isBotBalloonOpen, setIsBotBalloonOpen] = useState(false);
  const [supabaseTable, setSupabaseTable] = useState<string>('patients');
  const [supabaseRows, setSupabaseRows] = useState<SupabaseRow[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [supabaseInsertJson, setSupabaseInsertJson] = useState<string>('');
  const [adminSaveMessage, setAdminSaveMessage] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    online: boolean;
    lastSyncAt?: string | null;
    pending: number;
    error?: string | null;
  }>({ online: false, pending: 0 });
  const [syncLoading, setSyncLoading] = useState(false);
  const planMap = useMemo(() => new Map<string, AdminPlan>(adminData.plans.map((plan) => [plan.id, plan])), [adminData.plans]);
  const clinicMap = useMemo(
    () => new Map<string, AdminClinic>(adminData.clinics.map((clinic) => [clinic.id, clinic])),
    [adminData.clinics],
  );
  const selectedClinic = useMemo<AdminClinic | null>(
    () => (selectedClinicId ? adminData.clinics.find((clinic) => clinic.id === selectedClinicId) ?? null : null),
    [adminData.clinics, selectedClinicId],
  );

  const metrics = useMemo(
    () => [
      {
        label: 'Usuários ativos',
        value: String(adminData.logins.filter((login) => login.status === 'active').length),
        hint: 'Logins liberados para acesso ao sistema.',
        icon: <Users size={18} />,
      },
      {
        label: 'Clínicas',
        value: String(adminData.clinics.length),
        hint: 'Unidades cadastradas e associadas a planos.',
        icon: <Link2 size={18} />,
      },
      {
        label: 'Planos',
        value: String(adminData.plans.filter((plan) => plan.active).length),
        hint: 'Planos disponíveis para contratação e upgrade.',
        icon: <Layers3 size={18} />,
      },
      {
        label: 'Dados gerais',
        value: '100%',
        hint: 'Estrutura administrativa persistida no navegador.',
        icon: <Database size={18} />,
      },
    ],
    [adminData.clinics.length, adminData.logins, adminData.plans],
  );

  const planOptions = adminData.plans.map((plan) => (
    <option key={plan.id} value={plan.id}>
      {plan.name}
    </option>
  ));

  const clinicOptions = adminData.clinics.map((clinic) => (
    <option key={clinic.id} value={clinic.id}>
      {clinic.name}
    </option>
  ));

  const loadSyncStatus = async () => {
    try {
      const data = await apiRequest<typeof syncStatus>('/sync/status');
      setSyncStatus(data);
    } catch (error) {
      setSyncStatus((current) => ({
        ...current,
        online: false,
        error: error instanceof Error ? error.message : 'Falha ao consultar sincronização.',
      }));
    }
  };

  useEffect(() => {
    if (activeTab !== 'sincronizacao') return;
    void loadSyncStatus();
    const timer = window.setInterval(() => void loadSyncStatus(), 30000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  const runSyncNow = async () => {
    setSyncLoading(true);
    try {
      await apiRequest('/sync/run', { method: 'POST' });
      await loadSyncStatus();
      setAdminSaveMessage('Sincronização concluída.');
      showToast('Sincronização concluída.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao sincronizar.';
      setSyncStatus((current) => ({ ...current, error: message }));
      showToast(message, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const renderUsersTab = () => {
    const adminLogin = adminData.logins.find((login) => login.role === 'admin') ?? adminData.logins[0] ?? null;
    const clinicLogins = selectedClinic
      ? adminData.logins.filter((login) => login.clinicId === selectedClinic.id)
      : [];
    const selectedClinicPlan = selectedClinic ? planMap.get(selectedClinic.planId) ?? null : null;

    return (
      <div className="space-y-6">
        {adminLogin ? (
          <Card className="border-white/5 bg-white/[0.03]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-50">Administrador</h3>
                <p className="mt-1 text-sm text-zinc-500">Altere o e-mail e a senha do usuário administrador.</p>
              </div>
              <Badge variant="teal" dot>
                {adminLogin.email}
              </Badge>
            </div>

            <form
              className="mt-6 grid gap-3 md:grid-cols-2"
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                const newEmail = String(formData.get('adminEmail') ?? '').trim();
                const newPassword = String(formData.get('adminPassword') ?? '').trim();

                if (!adminLogin) return;

                try {
                  await updateAdminLogin(adminLogin.id, {
                    email: newEmail || adminLogin.email,
                    password: newPassword || undefined,
                  });

                  setAdminSaveMessage('Credenciais do administrador salvas.');
                  setTimeout(() => setAdminSaveMessage(null), 3000);
                } catch (error) {
                  showToast?.(error instanceof Error ? error.message : 'Falha ao salvar credenciais.', 'error');
                }
              }}
            >
              <label className="grid gap-2">
                <FieldLabel>E-mail do administrador</FieldLabel>
                <input
                  name="adminEmail"
                  defaultValue={adminLogin.email}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Senha</FieldLabel>
                <input
                  name="adminPassword"
                  type="password"
                  placeholder="Nova senha"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                />
              </label>

              <div className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                  >
                    <Save size={16} />
                    Salvar credenciais
                  </button>
                  {adminSaveMessage ? <p className="text-sm text-teal-300">{adminSaveMessage}</p> : null}
                </div>
              </div>
            </form>
          </Card>
        ) : null}

        <Card className="border-white/5 bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Clínicas</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Clique em uma clínica para abrir a unidade e os logins vinculados.
              </p>
            </div>
            <Badge variant="teal" dot>
              {adminData.clinics.length} unidades
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {adminData.clinics.map((clinic) => {
              const clinicPlan = planMap.get(clinic.planId);
              const isSelected = selectedClinic?.id === clinic.id;
              const loginCount = adminData.logins.filter((login) => login.clinicId === clinic.id).length;

              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => setSelectedClinicId((current) => (current === clinic.id ? null : clinic.id))}
                  className={`rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-teal-400/40 bg-teal-500/10 shadow-lg shadow-teal-500/5'
                      : 'border-white/5 bg-black/20 hover:border-teal-500/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{clinic.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {clinic.email} · {clinic.city}
                      </p>
                    </div>
                    <Badge variant={clinic.status === 'active' ? 'success' : 'warning'}>
                      {clinic.status === 'active' ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral">{clinicPlan?.name ?? 'Sem plano'}</Badge>
                    <Badge variant="teal">{loginCount} logins</Badge>
                  </div>

                  <p className="mt-2 text-[11px] text-zinc-500">
                    {isSelected ? 'Selecionada para edição' : 'Clique para abrir os detalhes'}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {adminData.clinics.length > 0 ? (
          selectedClinic ? (
            <Modal
              open={Boolean(selectedClinic)}
              onClose={() => setSelectedClinicId(null)}
              title={`Clínica ${selectedClinic.name}`}
              subtitle="Informações e edição da unidade selecionada"
              maxWidth="max-w-5xl"
              footer={
                <Button
                  onClick={() => setSelectedClinicId(null)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/15"
                >
                  Fechar
                </Button>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-white/5 bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-50">Unidade selecionada</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Edite os dados da clínica e o plano contratado.
                      </p>
                    </div>
                    <Badge variant="teal" dot>
                      {selectedClinicPlan?.name ?? 'Sem plano'}
                    </Badge>
                  </div>

                  <form
                    key={selectedClinic.id}
                    className="mt-6 grid gap-3 md:grid-cols-2"
                    onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);

                      try {
                        await updateAdminClinic(selectedClinic.id, {
                          name: String(formData.get('name') ?? '').trim(),
                          email: String(formData.get('email') ?? '').trim(),
                          phone: String(formData.get('phone') ?? '').trim(),
                          city: String(formData.get('city') ?? '').trim(),
                          planId: String(formData.get('planId') ?? selectedClinic.planId),
                          status: formData.get('status') === 'paused' ? 'paused' : 'active',
                          notes: String(formData.get('notes') ?? '').trim(),
                          accessPassword: String(formData.get('accessPassword') ?? '').trim(),
                        });
                        showToast?.('Unidade conectada ao frontend e login atualizado.', 'success');
                      } catch (error) {
                        showToast?.(error instanceof Error ? error.message : 'Falha ao salvar unidade.', 'error');
                      }
                    }}
                  >
                    <label className="grid gap-2">
                      <FieldLabel>Nome</FieldLabel>
                      <input
                        name="name"
                        defaultValue={selectedClinic.name}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      />
                    </label>
                    <label className="grid gap-2">
                      <FieldLabel>E-mail</FieldLabel>
                      <input
                        name="email"
                        defaultValue={selectedClinic.email}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      />
                    </label>
                    <label className="grid gap-2">
                      <FieldLabel>Telefone</FieldLabel>
                      <input
                        name="phone"
                        defaultValue={selectedClinic.phone}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      />
                    </label>
                    <label className="grid gap-2">
                      <FieldLabel>Cidade</FieldLabel>
                      <input
                        name="city"
                        defaultValue={selectedClinic.city}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      />
                    </label>
                    <label className="grid gap-2">
                      <FieldLabel>Plano</FieldLabel>
                      <select
                        name="planId"
                        defaultValue={selectedClinic.planId}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        {planOptions}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <FieldLabel>Status</FieldLabel>
                      <select
                        name="status"
                        defaultValue={selectedClinic.status}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        <option value="active">Ativa</option>
                        <option value="paused">Pausada</option>
                      </select>
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <FieldLabel>Observações</FieldLabel>
                      <textarea
                        name="notes"
                        defaultValue={selectedClinic.notes}
                        rows={3}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <FieldLabel>Senha de acesso da unidade</FieldLabel>
                      <input
                        name="accessPassword"
                        type="password"
                        defaultValue={selectedClinic.accessPassword ?? ''}
                        placeholder="Defina a senha de login da clínica"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                      >
                        <Save size={16} />
                        Salvar unidade
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteAdminClinic(selectedClinic.id)
                            .then(() => {
                              showToast?.('Unidade removida do admin e dos logins.', 'success');
                              setSelectedClinicId(null);
                            })
                            .catch((error) => {
                              showToast?.(error instanceof Error ? error.message : 'Falha ao excluir unidade.', 'error');
                            });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <Trash2 size={16} />
                        Excluir unidade
                      </button>
                    </div>
                  </form>
                </Card>

                <Card className="border-white/5 bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-50">Logins da unidade</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Gerencie os acessos vinculados a {selectedClinic.name}.
                      </p>
                    </div>
                    <Badge variant="teal" dot>
                      {clinicLogins.length} logins
                    </Badge>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {clinicLogins.map((login) => (
                      <form
                        key={login.id}
                        className="rounded-2xl border border-white/5 bg-black/20 p-5"
                        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);

                          try {
                            await updateAdminLogin(login.id, {
                              name: String(formData.get('name') ?? '').trim(),
                              email: String(formData.get('email') ?? '').trim(),
                              password: String(formData.get('password') ?? '').trim() || undefined,
                              clinicId: String(formData.get('clinicId') ?? login.clinicId),
                              planId: String(formData.get('planId') ?? login.planId),
                              role: String(formData.get('role') ?? login.role) as typeof login.role,
                              status: formData.get('status') === 'suspended' ? 'suspended' : 'active',
                              protected: formData.get('protected') === 'on',
                            });
                            showToast?.('Login salvo no backend.', 'success');
                          } catch (error) {
                            showToast?.(error instanceof Error ? error.message : 'Falha ao salvar login.', 'error');
                          }
                        }}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-100">{login.name}</p>
                              <Badge variant={login.status === 'active' ? 'success' : 'warning'}>
                                {login.status === 'active' ? 'Ativo' : 'Suspenso'}
                              </Badge>
                              {login.protected ? <Badge variant="info">Protegido</Badge> : null}
                            </div>
                            <p className="text-sm text-zinc-500">
                              {login.email} · {planMap.get(login.planId)?.name ?? 'Sem plano'}
                            </p>
                          </div>
                          <Badge variant="neutral">{clinicMap.get(login.clinicId)?.name ?? 'Sem clínica'}</Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="grid gap-2">
                            <FieldLabel>Nome</FieldLabel>
                            <input
                              name="name"
                              defaultValue={login.name}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            />
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>E-mail</FieldLabel>
                            <input
                              name="email"
                              defaultValue={login.email}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            />
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>Senha</FieldLabel>
                            <input
                              name="password"
                              type="password"
                              defaultValue={login.password}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            />
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>Unidade</FieldLabel>
                            <select
                              name="clinicId"
                              defaultValue={login.clinicId}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            >
                              {clinicOptions}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>Plano</FieldLabel>
                            <select
                              name="planId"
                              defaultValue={login.planId}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            >
                              {planOptions}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>Perfil</FieldLabel>
                            <select
                              name="role"
                              defaultValue={login.role}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="reception">Recepção</option>
                              <option value="doctor">Médico</option>
                              <option value="finance">Financeiro</option>
                              <option value="support">Suporte</option>
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <FieldLabel>Status</FieldLabel>
                            <select
                              name="status"
                              defaultValue={login.status}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                            >
                              <option value="active">Ativo</option>
                              <option value="suspended">Suspenso</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 md:col-span-2">
                            <input
                              name="protected"
                              type="checkbox"
                              defaultChecked={login.protected}
                              className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                            />
                            Manter login protegido contra exclusão
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                          >
                            <Save size={16} />
                            Salvar login
                          </button>
                          <button
                            type="button"
                            disabled={login.protected}
                            onClick={() => {
                              void deleteAdminLogin(login.id).catch((error) => {
                                showToast?.(error instanceof Error ? error.message : 'Falha ao excluir login.', 'error');
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Excluir
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>

                  <form
                    className="mt-6 rounded-2xl border border-dashed border-teal-500/25 bg-teal-500/5 p-5"
                    onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);

                      const email = String(formData.get('email') ?? '').trim();
                      const password = String(formData.get('password') ?? '').trim();

                      try {
                        if (!email || !password) {
                          showToast?.('Informe e-mail e senha para criar o login.', 'error');
                          return;
                        }

                        await addAdminLogin({
                          name: String(formData.get('name') ?? '').trim(),
                          email,
                          password,
                          clinicId: String(formData.get('clinicId') ?? selectedClinic.id),
                          planId: String(formData.get('planId') ?? selectedClinic.planId),
                          role: String(formData.get('role') ?? 'reception') as
                            | 'owner'
                            | 'admin'
                            | 'reception'
                            | 'doctor'
                            | 'finance'
                            | 'support',
                          status: formData.get('status') === 'suspended' ? 'suspended' : 'active',
                          protected: formData.get('protected') === 'on',
                        });

                        showToast?.('Login criado no backend.', 'success');
                        event.currentTarget.reset();
                      } catch (error) {
                        showToast?.(error instanceof Error ? error.message : 'Falha ao criar login.', 'error');
                      }
                    }}
                  >
                    <h4 className="text-sm font-semibold text-zinc-100">Novo login</h4>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input
                        name="name"
                        placeholder="Nome"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                      />
                      <input
                        name="email"
                        placeholder="E-mail"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                      />
                      <input
                        name="password"
                        type="password"
                        placeholder="Senha"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                      />
                      <select
                        name="clinicId"
                        defaultValue={selectedClinic.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        {clinicOptions}
                      </select>
                      <select
                        name="planId"
                        defaultValue={selectedClinic.planId}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        {planOptions}
                      </select>
                      <select
                        name="role"
                        defaultValue="reception"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="reception">Recepção</option>
                        <option value="doctor">Médico</option>
                        <option value="finance">Financeiro</option>
                        <option value="support">Suporte</option>
                      </select>
                      <select
                        name="status"
                        defaultValue="active"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                      >
                        <option value="active">Ativo</option>
                        <option value="suspended">Suspenso</option>
                      </select>
                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 md:col-span-2">
                        <input
                          name="protected"
                          type="checkbox"
                          className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                        />
                        Login protegido contra exclusão
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                    >
                      <Save size={16} />
                      Adicionar login
                    </button>
                  </form>
                </Card>
              </div>
            </Modal>
          ) : null
        ) : (
          <Card className="border-white/5 bg-white/[0.03]">
            <p className="text-sm text-zinc-500">Nenhuma clínica cadastrada ainda.</p>
          </Card>
        )}

        <Card className="border-white/5 bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Nova unidade</h3>
              <p className="mt-1 text-sm text-zinc-500">Crie uma clínica e depois clique nela para gerenciar os logins.</p>
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 md:grid-cols-2"
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              try {
                await addAdminClinic({
                  name: String(formData.get('name') ?? '').trim(),
                  email: String(formData.get('email') ?? '').trim(),
                  phone: String(formData.get('phone') ?? '').trim(),
                  city: String(formData.get('city') ?? '').trim(),
                  planId: String(formData.get('planId') ?? adminData.plans[0]?.id ?? ''),
                  notes: String(formData.get('notes') ?? '').trim(),
                  accessPassword: String(formData.get('accessPassword') ?? '').trim(),
                  status: formData.get('status') === 'paused' ? 'paused' : 'active',
                });

                event.currentTarget.reset();
                showToast?.('Clínica criada e login liberado no frontend.', 'success');
              } catch (error) {
                showToast?.(error instanceof Error ? error.message : 'Falha ao criar clínica.', 'error');
              }
            }}
          >
            <input
              name="name"
              placeholder="Nome da clínica"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <input
              name="email"
              placeholder="E-mail"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <input
              name="phone"
              placeholder="Telefone"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <input
              name="city"
              placeholder="Cidade"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <select
              name="planId"
              defaultValue={adminData.plans[0]?.id ?? ''}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50 md:col-span-2"
            >
              {planOptions}
            </select>
            <select
              name="status"
              defaultValue="active"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50 md:col-span-2"
            >
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
            </select>
            <textarea
              name="notes"
              placeholder="Observações"
              rows={3}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50 md:col-span-2"
            />
            <input
              name="accessPassword"
              type="password"
              placeholder="Senha de acesso da clínica"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50 md:col-span-2"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400 md:col-span-2 md:w-fit"
            >
              <Save size={16} />
              Adicionar clínica
            </button>
          </form>
        </Card>
      </div>
    );
  };

  const renderPlansTab = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-white/5 bg-white/[0.03] xl:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-50">Planos</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Ajuste preços, descrição e recursos de cada plano disponível.
            </p>
          </div>
          <Badge variant="teal" dot>
            {adminData.plans.length} planos
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminData.plans.map((plan) => (
            <form
              key={plan.id}
              className="rounded-2xl border border-white/5 bg-black/20 p-5"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                updateAdminPlan(plan.id, {
                  name: String(formData.get('name') ?? '').trim(),
                  monthlyPrice: parseMoney(formData.get('monthlyPrice')),
                  description: String(formData.get('description') ?? '').trim(),
                  features: parseFeatureList(formData.get('features')),
                  active: formData.get('active') === 'on',
                });
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-400">{plan.name}</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-50">
                    {formatCurrency(plan.monthlyPrice)}
                  </p>
                </div>
                <Badge variant={plan.active ? 'success' : 'warning'}>
                  {plan.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <FieldLabel>Nome</FieldLabel>
                  <input
                    name="name"
                    defaultValue={plan.name}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Preço mensal</FieldLabel>
                  <input
                    name="monthlyPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={plan.monthlyPrice}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Descrição</FieldLabel>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={plan.description}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Recursos</FieldLabel>
                  <textarea
                    name="features"
                    rows={3}
                    defaultValue={plan.features.join(', ')}
                    placeholder="Separar por vírgulas"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={plan.active}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                  Plano ativo
                </label>
              </div>

              <button
                type="submit"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
              >
                <Save size={16} />
                Salvar plano
              </button>
            </form>
          ))}
        </div>

        <form
          className="mt-6 rounded-2xl border border-dashed border-teal-500/25 bg-teal-500/5 p-5"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            addAdminPlan({
              name: String(formData.get('name') ?? '').trim(),
              monthlyPrice: parseMoney(formData.get('monthlyPrice')),
              description: String(formData.get('description') ?? '').trim(),
              features: parseFeatureList(formData.get('features')),
              active: formData.get('active') === 'on',
            });

            showToast?.('Novo plano adicionado com sucesso!', 'success');
            event.currentTarget.reset();
          }}
        >
          <h4 className="text-sm font-semibold text-zinc-100">Novo plano</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              name="name"
              placeholder="Nome do plano"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <input
              name="monthlyPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="Preço mensal"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
            />
            <textarea
              name="description"
              rows={3}
              placeholder="Descrição"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50 md:col-span-2"
            />
            <textarea
              name="features"
              rows={3}
              placeholder="Recursos separados por vírgula"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50 md:col-span-2"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 md:col-span-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
              />
              Plano ativo
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
          >
            <Save size={16} />
            Adicionar plano
          </button>
        </form>
      </Card>
    </div>
  );

  const renderReportsTab = () => {
    const planReports = adminData.plans.map((plan) => {
      const contractedClinics = adminData.clinics.filter((clinic) => clinic.planId === plan.id);
      const activeClinics = contractedClinics.filter((clinic) => clinic.status === 'active');

      return {
        ...plan,
        contractedClinics: contractedClinics.length,
        activeClinics: activeClinics.length,
        monthlyRevenue: contractedClinics.length * plan.monthlyPrice,
      };
    });

    const totalMonthlyRevenue = planReports.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
    const activeContracts = adminData.clinics.filter((clinic) => clinic.status === 'active').length;
    const plansWithContracts = planReports.filter((plan) => plan.contractedClinics > 0).length;
    const topPlan = [...planReports].sort((first, second) => second.monthlyRevenue - first.monthlyRevenue)[0] ?? null;

    return (
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.03] xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Relatórios financeiros</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Receita recorrente estimada com base nos planos contratados pelas clínicas.
              </p>
            </div>
            <Badge variant="teal" dot>
              {adminData.clinics.length} contratos
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              label="Receita mensal"
              value={formatCurrency(totalMonthlyRevenue)}
              hint="Estimativa total da carteira contratada."
              icon={<BarChart3 size={18} />}
            />
            <MetricCard
              label="Contratos ativos"
              value={String(activeContracts)}
              hint="Clínicas com status ativo."
              icon={<Link2 size={18} />}
            />
            <MetricCard
              label="Planos faturáveis"
              value={String(plansWithContracts)}
              hint="Planos com ao menos uma clínica."
              icon={<Layers3 size={18} />}
            />
          </div>

          <div className="mt-6 grid gap-3">
            {planReports.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-100">{plan.name}</p>
                  <p className="text-sm text-zinc-500">
                    {plan.contractedClinics} clínicas contratadas · {plan.activeClinics} ativas
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-50">{formatCurrency(plan.monthlyRevenue)}</p>
                  <p className="text-xs text-zinc-500">Receita mensal</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-white/5 bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Resumo da carteira</h3>
              <p className="mt-1 text-sm text-zinc-500">Visão rápida dos planos com maior impacto financeiro.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Maior faturamento</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{topPlan?.name ?? 'Sem contratos'}</p>
              <p className="text-sm text-zinc-500">
                {topPlan ? formatCurrency(topPlan.monthlyRevenue) : 'Nenhuma clínica contratada'}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total de contratos</p>
                <p className="mt-1 text-lg font-bold text-zinc-50">{adminData.clinics.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Planos com contrato</p>
                <p className="mt-1 text-lg font-bold text-zinc-50">{plansWithContracts}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Receita mensal estimada</p>
                <p className="mt-1 text-lg font-bold text-zinc-50">{formatCurrency(totalMonthlyRevenue)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderIntegrationsTab = () => {
    const currentSettings: AdminIntegrationSettings =
      integrationSettings ?? {
        clinicName: 'Clinic Organizer Pro',
        clinicAddress: '',
        clinicCity: '',
        clinicEmail: '',
        clinicPhone: '',
        appName: 'Clinic Organizer Pro SaaS',
        siteUrl: '',
        whatsappApiUrl: '',
        whatsappApiKey: '',
        whatsappEnabled: false,
        emailSmtpHost: '',
        emailSmtpPort: '587',
        emailSmtpUser: '',
        emailSmtpPassword: '',
        emailSmtpSecure: true,
        aiApiUrl: '',
        aiApiKey: '',
        aiModel: 'gpt-4o-mini',
        aiEnabled: false,
        supabaseUrl: '',
        supabaseAnonKey: '',
        supabaseEnabled: false,
        stripeSecretKey: '',
        stripePublishableKey: '',
        stripeWebhookSecret: '',
        stripeEnabled: false,
        updatedAt: '',
      };

    async function handleFetchSupabase() {
      setSupabaseLoading(true);
      setSupabaseError(null);

      const url = currentSettings.supabaseUrl;
      const key = currentSettings.supabaseAnonKey;

      if (!url || !key) {
        setSupabaseError('Supabase não configurado. Salve as integrações antes de usar.');
        setSupabaseLoading(false);
        return;
      }

      try {
        const data = (await fetchTableRows(url, key, supabaseTable || 'patients', 100)) as SupabaseRow[];
        setSupabaseRows(data ?? []);
      } catch (err) {
        setSupabaseError(err instanceof Error ? err.message : String(err));
      }

      setSupabaseLoading(false);
    }

    async function handleInsertSupabase() {
      setSupabaseLoading(true);
      setSupabaseError(null);

      const url = currentSettings.supabaseUrl;
      const key = currentSettings.supabaseAnonKey;

      if (!url || !key) {
        setSupabaseError('Supabase não configurado. Salve as integrações antes de usar.');
        setSupabaseLoading(false);
        return;
      }

      try {
        const payload = supabaseInsertJson ? JSON.parse(supabaseInsertJson) : {};
        await insertSupabaseRow(url, key, supabaseTable || 'patients', payload);
        await handleFetchSupabase();
        setSupabaseInsertJson('');
      } catch (err) {
        setSupabaseError(err instanceof Error ? err.message : String(err));
      }

      setSupabaseLoading(false);
    }

    async function handleDeleteSupabase(id: string) {
      setSupabaseLoading(true);
      setSupabaseError(null);

      const url = currentSettings.supabaseUrl;
      const key = currentSettings.supabaseAnonKey;

      if (!url || !key) {
        setSupabaseError('Supabase não configurado. Salve as integrações antes de usar.');
        setSupabaseLoading(false);
        return;
      }

      try {
        await deleteSupabaseRow(url, key, supabaseTable || 'patients', id);
        await handleFetchSupabase();
      } catch (err) {
        setSupabaseError(err instanceof Error ? err.message : String(err));
      }

      setSupabaseLoading(false);
    }

    return (
      <Card className="border-white/5 bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-50">Integrações</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Configure WhatsApp, e-mail, IA e OAuth. As configurações ficam salvas por usuário.
            </p>
          </div>
          <Badge variant="teal" dot>
            {adminSession?.email ?? 'admin'}
          </Badge>
        </div>

        <form
          className="mt-6"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            updateIntegrationSettings({
              whatsappApiUrl: String(formData.get('whatsappApiUrl') ?? '').trim(),
              whatsappApiKey: String(formData.get('whatsappApiKey') ?? '').trim(),
              whatsappEnabled: formData.get('whatsappEnabled') === 'on',
              emailSmtpHost: String(formData.get('emailSmtpHost') ?? '').trim(),
              emailSmtpPort: String(formData.get('emailSmtpPort') ?? '').trim(),
              emailSmtpUser: String(formData.get('emailSmtpUser') ?? '').trim(),
              emailSmtpPassword: String(formData.get('emailSmtpPassword') ?? '').trim(),
              emailSmtpSecure: formData.get('emailSmtpSecure') === 'on',
              aiApiUrl: String(formData.get('aiApiUrl') ?? '').trim(),
              aiApiKey: String(formData.get('aiApiKey') ?? '').trim(),
              aiModel: String(formData.get('aiModel') ?? '').trim(),
              aiEnabled: formData.get('aiEnabled') === 'on',
              stripeSecretKey: String(formData.get('stripeSecretKey') ?? '').trim(),
              stripePublishableKey: String(formData.get('stripePublishableKey') ?? '').trim(),
              stripeWebhookSecret: String(formData.get('stripeWebhookSecret') ?? '').trim(),
              stripeEnabled: formData.get('stripeEnabled') === 'on',
            });
          }}
        >
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">WhatsApp API</h4>
                  <p className="mt-1 text-xs text-zinc-500">Integração para mensagens e automações.</p>
                </div>
                <Badge variant={currentSettings.whatsappEnabled ? 'success' : 'warning'}>
                  {currentSettings.whatsappEnabled ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <FieldLabel>URL da API</FieldLabel>
                  <input
                    name="whatsappApiUrl"
                    defaultValue={currentSettings.whatsappApiUrl}
                    placeholder="https://api.exemplo.com/whatsapp"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Chave da API</FieldLabel>
                  <input
                    name="whatsappApiKey"
                    type="password"
                    defaultValue={currentSettings.whatsappApiKey}
                    placeholder="••••••••"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">
                  <input
                    name="whatsappEnabled"
                    type="checkbox"
                    defaultChecked={currentSettings.whatsappEnabled}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                  Habilitar WhatsApp API
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-black/20 p-4 xl:col-span-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">Supabase (Admin)</h4>
                  <p className="mt-1 text-xs text-zinc-500">Acesse tabelas diretamente via API REST do Supabase (PostgREST).</p>
                </div>
                <Badge variant={currentSettings.supabaseEnabled ? 'success' : 'warning'}>
                  {currentSettings.supabaseEnabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <FieldLabel>Tabela</FieldLabel>
                  <input
                    name="supabaseTable"
                    value={supabaseTable}
                    onChange={(e) => setSupabaseTable(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleFetchSupabase()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                  >
                    <RefreshCw size={16} />
                    Buscar linhas
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleInsertSupabase()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                  >
                    <Save size={16} />
                    Inserir JSON
                  </button>
                </div>

                <label className="grid gap-2">
                  <FieldLabel>JSON para inserção</FieldLabel>
                  <textarea
                    rows={4}
                    value={supabaseInsertJson}
                    onChange={(e) => setSupabaseInsertJson(e.target.value)}
                    placeholder='Ex: {"name":"João", "phone":"(11) 99999-9999"}'
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>

                {supabaseError ? <p className="text-sm text-rose-400">{supabaseError}</p> : null}

                <div className="mt-2">
                  <p className="text-xs text-zinc-500">Linhas (últimas {supabaseRows.length}):</p>
                  <div className="mt-2 max-h-48 overflow-auto rounded-md border border-white/5 bg-black/10 p-2 text-xs">
                    {supabaseLoading ? <p className="text-sm text-zinc-400">Carregando...</p> : null}
                    {supabaseRows.length === 0 && !supabaseLoading ? <p className="text-sm text-zinc-500">Nenhuma linha.</p> : null}
                    {supabaseRows.map((row) => (
                      <div key={row.id ?? JSON.stringify(row)} className="mb-2 flex items-start justify-between gap-2">
                        <pre className="whitespace-pre-wrap break-words text-xs text-zinc-300">{JSON.stringify(row, null, 2)}</pre>
                        {row.id ? (
                          <button
                            onClick={() => void handleDeleteSupabase(String(row.id))}
                            className="ml-2 inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">Email SMTP</h4>
                  <p className="mt-1 text-xs text-zinc-500">Configuração para envio de e-mails transacionais.</p>
                </div>
                <Badge variant={currentSettings.emailSmtpSecure ? 'info' : 'neutral'}>
                  {currentSettings.emailSmtpSecure ? 'SSL/TLS' : 'Sem SSL'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <FieldLabel>Host SMTP</FieldLabel>
                  <input
                    name="emailSmtpHost"
                    defaultValue={currentSettings.emailSmtpHost}
                    placeholder="smtp.exemplo.com"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2">
                    <FieldLabel>Porta</FieldLabel>
                    <input
                      name="emailSmtpPort"
                      defaultValue={currentSettings.emailSmtpPort}
                      placeholder="587"
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                    />
                  </label>
                  <label className="grid gap-2">
                    <FieldLabel>Usuário</FieldLabel>
                    <input
                      name="emailSmtpUser"
                      defaultValue={currentSettings.emailSmtpUser}
                      placeholder="usuario@dominio.com"
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                    />
                  </label>
                </div>
                <label className="grid gap-2">
                  <FieldLabel>Senha</FieldLabel>
                  <input
                    name="emailSmtpPassword"
                    type="password"
                    defaultValue={currentSettings.emailSmtpPassword}
                    placeholder="••••••••"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">
                  <input
                    name="emailSmtpSecure"
                    type="checkbox"
                    defaultChecked={currentSettings.emailSmtpSecure}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                  Conexão segura
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">IA</h4>
                  <p className="mt-1 text-xs text-zinc-500">
                    Endpoint, chave e modelo do provedor de IA.
                  </p>
                </div>
                <Badge variant={currentSettings.aiEnabled ? 'success' : 'warning'}>
                  {currentSettings.aiEnabled ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3">
                <label className="grid gap-2">
                  <FieldLabel>URL da API</FieldLabel>
                  <input
                    name="aiApiUrl"
                    defaultValue={currentSettings.aiApiUrl}
                    placeholder="https://api.exemplo.com/ai"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Chave da API</FieldLabel>
                  <input
                    name="aiApiKey"
                    type="password"
                    defaultValue={currentSettings.aiApiKey}
                    placeholder="••••••••"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Modelo</FieldLabel>
                  <input
                    name="aiModel"
                    defaultValue={currentSettings.aiModel}
                    placeholder="gpt-4o-mini"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">
                  <input
                    name="aiEnabled"
                    type="checkbox"
                    defaultChecked={currentSettings.aiEnabled}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                  Habilitar IA
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-black/20 p-4 xl:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">Stripe</h4>
                  <p className="mt-1 text-xs text-zinc-500">Pagamentos, assinaturas e webhooks.</p>
                </div>
                <Badge variant={currentSettings.stripeEnabled ? 'success' : 'warning'}>
                  {currentSettings.stripeEnabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <FieldLabel>Chave secreta</FieldLabel>
                  <input
                    name="stripeSecretKey"
                    type="password"
                    defaultValue={currentSettings.stripeSecretKey}
                    placeholder="sk_live_..."
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2">
                  <FieldLabel>Chave pública</FieldLabel>
                  <input
                    name="stripePublishableKey"
                    defaultValue={currentSettings.stripePublishableKey}
                    placeholder="pk_live_..."
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <FieldLabel>Webhook secret</FieldLabel>
                  <input
                    name="stripeWebhookSecret"
                    type="password"
                    defaultValue={currentSettings.stripeWebhookSecret}
                    placeholder="whsec_..."
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-teal-400/50"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 md:col-span-2">
                  <input
                    name="stripeEnabled"
                    type="checkbox"
                    defaultChecked={currentSettings.stripeEnabled}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                  Habilitar Stripe
                </label>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-zinc-500">
              As integrações são salvas separadamente por usuário autenticado.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
            >
              <Save size={16} />
              Salvar integrações
            </button>
          </div>
        </form>
      </Card>
    );
  };

  const renderSummaryTab = () => {
    const planAssignments = adminData.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.monthlyPrice,
      clinics: adminData.clinics.filter((clinic) => clinic.planId === plan.id).length,
      logins: adminData.logins.filter((login) => login.planId === plan.id).length,
      active: plan.active,
    }));

    return (
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.03] xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Dados gerais</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Resumo consolidado da operação administrativa.
              </p>
            </div>
            <Badge variant="info">Atualizado</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Clínicas ativas"
              value={String(adminData.clinics.filter((clinic) => clinic.status === 'active').length)}
              hint="Unidades operando normalmente."
              icon={<Link2 size={18} />}
            />
            <MetricCard
              label="Logins ativos"
              value={String(adminData.logins.filter((login) => login.status === 'active').length)}
              hint="Contas com acesso liberado."
              icon={<CircleUserRound size={18} />}
            />
            <MetricCard
              label="Planos ativos"
              value={String(adminData.plans.filter((plan) => plan.active).length)}
              hint="Planos comercializáveis."
              icon={<Layers3 size={18} />}
            />
            <MetricCard
              label="Protegidos"
              value={String(adminData.logins.filter((login) => login.protected).length)}
              hint="Logins não removíveis pela interface."
              icon={<ShieldCheck size={18} />}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
              <h4 className="text-sm font-semibold text-zinc-100">Distribuição por plano</h4>
              <div className="mt-4 grid gap-3">
                {planAssignments.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{plan.name}</p>
                      <p className="text-sm text-zinc-500">{formatCurrency(plan.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{plan.clinics} clínicas</Badge>
                      <Badge variant="teal">{plan.logins} logins</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
              <h4 className="text-sm font-semibold text-zinc-100">Clínicas com seus planos</h4>
              <div className="mt-4 grid gap-3">
                {adminData.clinics.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{clinic.name}</p>
                        <p className="text-sm text-zinc-500">{clinic.city}</p>
                      </div>
                      <Badge variant={clinic.status === 'active' ? 'success' : 'warning'}>
                        {planMap.get(clinic.planId)?.name ?? 'Sem plano'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-white/5 bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Perfil da Clínica</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Dados principais e preferências operacionais.
              </p>
            </div>
          </div>

          <form
            className="mt-6 grid gap-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              updateClinicProfile({
                clinicName: String(formData.get('clinicName') ?? adminData.clinicProfile.clinicName).trim(),
                responsibleName: String(formData.get('responsibleName') ?? '').trim(),
                email: String(formData.get('email') ?? adminData.clinicProfile.email).trim(),
                city: String(formData.get('city') ?? adminData.clinicProfile.city).trim(),
                phone: String(formData.get('phone') ?? '').trim(),
                cnpj: String(formData.get('cnpj') ?? '').trim(),
                address: String(formData.get('address') ?? '').trim(),
              });
            }}
          >
            <label className="grid gap-2">
              <FieldLabel>Nome da Clínica</FieldLabel>
              <input
                name="clinicName"
                defaultValue={adminData.clinicProfile.clinicName}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Responsável</FieldLabel>
              <input
                name="responsibleName"
                defaultValue={adminData.clinicProfile.responsibleName}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>E-mail</FieldLabel>
              <input
                name="email"
                type="email"
                defaultValue={adminData.clinicProfile.email}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Cidade</FieldLabel>
              <input
                name="city"
                defaultValue={adminData.clinicProfile.city}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>Telefone</FieldLabel>
              <input
                name="phone"
                defaultValue={adminData.clinicProfile.phone}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2">
              <FieldLabel>CNPJ</FieldLabel>
              <input
                name="cnpj"
                defaultValue={adminData.clinicProfile.cnpj}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <FieldLabel>Endereço</FieldLabel>
              <textarea
                name="address"
                rows={2}
                defaultValue={adminData.clinicProfile.address}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-teal-400/50"
              />
            </label>

            <div className="flex items-center gap-3 md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
              >
                <Save size={16} />
                Salvar dados da clínica
              </button>
            </div>
          </form>
        </Card>

        <Card className="border-white/5 bg-white/[0.03] xl:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Conta admin</h3>
              <p className="mt-1 text-sm text-zinc-500">Sessão conectada e ações rápidas.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Acesso atual</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{adminSession?.email ?? 'admin'}</p>
            </div>

            <Button
              onClick={() => refreshAdminData()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/15"
            >
              <RefreshCw size={16} />
              Recarregar dados
            </Button>

            <Button
              onClick={() => void signOut()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/15"
            >
              <LogOut size={16} />
              Sair do admin
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderSyncTab = () => (
    <div className="space-y-6">
      <Card className="border-white/5 bg-white/[0.03]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-50">Sincronização</h3>
            <p className="mt-1 text-sm text-zinc-500">Controle administrativo do SQLite local e Supabase online.</p>
          </div>
          <Badge variant={syncStatus.online ? 'teal' : 'warning'} dot>
            {syncStatus.online ? 'Online' : 'Offline'}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              {syncStatus.online ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-400" />
              )}
              <p className="text-sm font-semibold text-zinc-100">{syncStatus.online ? 'Conectado' : 'Sem conexão'}</p>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Status atual da nuvem Supabase.</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Último sync</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Itens pendentes</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-50">{syncStatus.pending}</p>
          </div>
        </div>

        {syncStatus.error ? (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
            {syncStatus.error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => void loadSyncStatus()}>
            Atualizar status
          </Button>
          <Button icon={<RefreshCw size={15} className={syncLoading ? 'animate-spin' : ''} />} onClick={runSyncNow} loading={syncLoading}>
            Sincronizar agora
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 text-zinc-100">
      <section className="rounded-[28px] border border-white/5 bg-gradient-to-br from-white/8 via-white/4 to-transparent p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/15 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
              <Settings2 size={12} />
              Painel administrativo
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-50 md:text-4xl">
              Sistema admin
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500 md:text-base">
              Área restrita para administrar usuários, planos, clínicas e dados gerais da plataforma.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">
                {adminSession?.email ?? 'admin'}
              </span>
              <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">
                Acesso seguro
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/15"
            >
              <LogOut size={16} />
              Sair do admin
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <TabButton
          active={activeTab === 'usuarios'}
          onClick={() => setActiveTab('usuarios')}
          icon={<Users size={16} />}
          label="Usuários"
        />
        <TabButton
          active={activeTab === 'planos'}
          onClick={() => setActiveTab('planos')}
          icon={<Layers3 size={16} />}
          label="Planos"
        />
        <TabButton
          active={activeTab === 'relatorios'}
          onClick={() => setActiveTab('relatorios')}
          icon={<BarChart3 size={16} />}
          label="Relatórios financeiros"
        />
        <TabButton
          active={activeTab === 'integracoes'}
          onClick={() => setActiveTab('integracoes')}
          icon={<Settings2 size={16} />}
          label="Integrações"
        />
        <TabButton
          active={activeTab === 'dados-gerais'}
          onClick={() => setActiveTab('dados-gerais')}
          icon={<Database size={16} />}
          label="Dados gerais"
        />
        <TabButton
          active={activeTab === 'sincronizacao'}
          onClick={() => setActiveTab('sincronizacao')}
          icon={<RefreshCw size={16} />}
          label="Sincronização"
        />
      </section>

      {activeTab === 'usuarios' ? renderUsersTab() : null}
      {activeTab === 'planos' ? renderPlansTab() : null}
      {activeTab === 'relatorios' ? renderReportsTab() : null}
      {activeTab === 'integracoes' ? renderIntegrationsTab() : null}
      {activeTab === 'dados-gerais' ? renderSummaryTab() : null}
      {activeTab === 'sincronizacao' ? renderSyncTab() : null}

      {/* BotPlugin Balloon */}
      <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-end">
        {isBotBalloonOpen ? (
          <div className="mb-4 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl transition-all" style={{ width: '400px', height: '600px', maxWidth: 'calc(100vw - 48px)' }}>
            <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-100">BotPlugin</h3>
              <button onClick={() => setIsBotBalloonOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <iframe 
              src="https://app.botplugin.com.br/session/6a0d0b86ea28b62787d10f0b?tab=tab11" 
              className="flex-1 w-full h-full bg-white"
              title="BotPlugin Session"
            />
          </div>
        ) : null}
        
        <button
          type="button"
          onClick={() => setIsBotBalloonOpen(!isBotBalloonOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/20 transition-transform hover:scale-105"
        >
          {isBotBalloonOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
}
