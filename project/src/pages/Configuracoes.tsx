import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/useApp';

type SettingsSection = 'clinic' | 'notifications' | 'team' | 'billing' | 'security';

type ThemeMode = 'light' | 'dark';

interface ThemeClasses {
  page: string;
  panel: string;
  panelSoft: string;
  border: string;
  text: string;
  textMuted: string;
  textSoft: string;
  input: string;
  buttonSecondary: string;
  dangerSoft: string;
  successSoft: string;
  badge: string;
  overlay: string;
  navItem: string;
  navItemActive: string;
  switchOff: string;
}

interface ProfessionalFormState {
  id?: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  color: string;
  isActive: boolean;
}

interface SectionProps {
  theme: ThemeMode;
  t: (path: string, fallback: string) => string;
  styles: ThemeClasses;
}

interface ClinicSectionProps extends SectionProps {
  onSave: (message: string) => void;
}

interface NotificationsSectionProps extends SectionProps {
  onSave: (message: string) => void;
}

interface TeamSectionProps extends SectionProps {
  professionals: any[];
  onSave: (message: string) => void;
  onAddProfessional?: (payload: Record<string, unknown>) => void;
  onUpdateProfessional?: (id: string, payload: Record<string, unknown>) => void;
  onDeleteProfessional?: (id: string) => void;
}

interface BillingSectionProps extends SectionProps {
  onSave: (message: string) => void;
}

interface SecuritySectionProps extends SectionProps {
  onSave: (message: string) => void;
  signOut?: () => Promise<void>;
}

function getThemeClasses(theme: ThemeMode): ThemeClasses {
  const isDark = theme === 'dark';

  return {
    page: isDark ? 'bg-mesh text-zinc-100' : 'bg-slate-50 text-slate-900',
    panel: isDark 
      ? 'card-premium gradient-vivid-elegant layer-surface layer-elevated rounded-2xl p-6 border border-white/8'
      : 'bg-white border border-slate-200 shadow-sm rounded-2xl p-6',
    panelSoft: isDark 
      ? 'rounded-2xl border border-white/5 p-4' 
      : 'bg-slate-50 border border-slate-200 rounded-2xl p-4',
    border: isDark ? 'border-white/8' : 'border-slate-200',
    text: isDark ? 'text-zinc-100' : 'text-slate-900',
    textMuted: isDark ? 'text-zinc-500' : 'text-slate-600',
    textSoft: isDark ? 'text-zinc-400' : 'text-slate-700',
    input: isDark
      ? 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none focus:bg-white/8 transition-all'
      : 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none',
    buttonSecondary: isDark
      ? 'rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/8 hover:border-white/15'
      : 'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50',
    dangerSoft: isDark
      ? 'rounded-xl border border-red-500/30 bg-red-500/10 text-red-300'
      : 'rounded-xl border border-red-200 bg-red-50 text-red-700',
    successSoft: isDark
      ? 'rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300'
      : 'rounded-xl border border-teal-200 bg-teal-50 text-teal-700',
    badge: isDark
      ? 'rounded-full border border-teal-500/30 bg-teal-500/15 px-3 py-1 text-xs font-medium text-teal-300'
      : 'rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700',
    overlay: isDark ? 'bg-black/40' : 'bg-slate-900/40',
    navItem: isDark
      ? 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200'
      : 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900',
    navItemActive: isDark
      ? 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30'
      : 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200',
    switchOff: isDark ? 'bg-white/10' : 'bg-slate-300',
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  styles,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  styles: ThemeClasses;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className={`text-sm font-medium ${styles.textSoft}`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  styles,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  styles: ThemeClasses;
}) {
  return (
    <label className="space-y-2">
      <span className={`text-sm font-medium ${styles.textSoft}`}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.input}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  styles,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  styles: ThemeClasses;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-2xl p-4 ${styles.panelSoft}`}>
      <div>
        <h4 className={`text-sm font-semibold ${styles.text}`}>{label}</h4>
        <p className={`mt-1 text-sm ${styles.textMuted}`}>{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? 'bg-teal-500' : styles.switchOff
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  styles,
}: {
  title: string;
  description: string;
  styles: ThemeClasses;
}) {
  return (
    <div className="mb-6">
      <h2 className={`text-2xl font-bold ${styles.text}`}>{title}</h2>
      <p className={`mt-2 text-sm ${styles.textMuted}`}>{description}</p>
    </div>
  );
}

function ClinicSection({ theme, t, styles, onSave }: ClinicSectionProps) {
  const { clinicProfile, updateClinicProfile } = useApp() as any;
  const [form, setForm] = useState({
    clinicName: clinicProfile?.clinicName ?? 'Clinic Organizer Pro',
    responsibleName: 'Dra. Ana Paula',
    email: clinicProfile?.email ?? 'contato@clinicorganizerpro.com',
    city: clinicProfile?.city ?? 'São Paulo',
    phone: '(11) 99999-9999',
    cnpj: '00.000.000/0001-00',
    address: clinicProfile?.address ?? 'Av. Paulista, 1000 - São Paulo, SP',
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    setForm((current) => ({
      ...current,
      clinicName: clinicProfile?.clinicName ?? current.clinicName,
      email: clinicProfile?.email ?? current.email,
      city: clinicProfile?.city ?? current.city,
      address: clinicProfile?.address ?? current.address,
    }));
  }, [clinicProfile?.clinicName, clinicProfile?.email, clinicProfile?.city, clinicProfile?.address]);

  return (
    <div className={`rounded-3xl p-6 md:p-8 ${styles.panel}`}>
      <SectionHeader
        title={t('settings.sections.clinic.title', 'Clínica')}
        description={t(
          'settings.sections.clinic.description',
          'Atualize os dados principais da clínica e as preferências operacionais.',
        )}
        styles={styles}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={t('settings.fields.clinicName', 'Nome da clínica')}
          value={form.clinicName}
          onChange={(value) => setForm((current) => ({ ...current, clinicName: value }))}
          styles={styles}
        />
        <Field
          label={t('settings.fields.responsibleName', 'Responsável')}
          value={form.responsibleName}
          onChange={(value) => setForm((current) => ({ ...current, responsibleName: value }))}
          styles={styles}
        />
        <Field
          label={t('settings.fields.email', 'E-mail')}
          value={form.email}
          onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          styles={styles}
          type="email"
        />
        <Field
          label={t('settings.fields.city', 'Cidade')}
          value={form.city}
          onChange={(value) => setForm((current) => ({ ...current, city: value }))}
          styles={styles}
        />
        <Field
          label={t('settings.fields.phone', 'Telefone')}
          value={form.phone}
          onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
          styles={styles}
        />
        <Field
          label={t('settings.fields.cnpj', 'CNPJ')}
          value={form.cnpj}
          onChange={(value) => setForm((current) => ({ ...current, cnpj: value }))}
          styles={styles}
        />
        <Field
          label={t('settings.fields.address', 'Endereço')}
          value={form.address}
          onChange={(value) => setForm((current) => ({ ...current, address: value }))}
          styles={styles}
        />
      </div>

      <div className={`mt-6 rounded-2xl p-4 ${isDark ? 'bg-teal-500/10 text-teal-200' : 'bg-teal-50 text-teal-700'}`}>
        <p className="text-sm">
          {t(
            'settings.sections.clinic.helper',
            'Essas informações são usadas em relatórios, faturamento e comunicações automáticas.',
          )}
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            updateClinicProfile?.({
              clinicName: form.clinicName,
              email: form.email,
              city: form.city,
              address: form.address,
            });
            onSave(t('settings.toasts.clinicSaved', 'Dados da clínica salvos com sucesso!'));
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
        >
          <Save className="h-4 w-4" />
          {t('settings.actions.saveChanges', 'Salvar alterações')}
        </button>
      </div>
    </div>
  );
}

function NotificationsSection({ t, styles, onSave }: NotificationsSectionProps) {
  const [settings, setSettings] = useState({
    appointments: true,
    confirmations: true,
    cancellations: true,
    financialAlerts: false,
    whatsappSummary: true,
    marketingReports: false,
  });

  return (
    <div className={`rounded-3xl p-6 md:p-8 ${styles.panel}`}>
      <SectionHeader
        title={t('settings.sections.notifications.title', 'Notificações')}
        description={t(
          'settings.sections.notifications.description',
          'Defina quais alertas e lembretes você deseja receber no sistema.',
        )}
        styles={styles}
      />

      <div className="space-y-4">
        <ToggleRow
          label={t('settings.notifications.appointments', 'Novos agendamentos')}
          description={t(
            'settings.notifications.appointmentsDescription',
            'Receba alertas sempre que um novo agendamento for criado.',
          )}
          checked={settings.appointments}
          onChange={(value) => setSettings((current) => ({ ...current, appointments: value }))}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.notifications.confirmations', 'Confirmações automáticas')}
          description={t(
            'settings.notifications.confirmationsDescription',
            'Envie lembretes automáticos para confirmação de consultas.',
          )}
          checked={settings.confirmations}
          onChange={(value) => setSettings((current) => ({ ...current, confirmations: value }))}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.notifications.cancellations', 'Cancelamentos e faltas')}
          description={t(
            'settings.notifications.cancellationsDescription',
            'Seja avisado quando consultas forem canceladas ou marcadas como falta.',
          )}
          checked={settings.cancellations}
          onChange={(value) => setSettings((current) => ({ ...current, cancellations: value }))}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.notifications.financialAlerts', 'Alertas financeiros')}
          description={t(
            'settings.notifications.financialAlertsDescription',
            'Receba avisos sobre atrasos, recebimentos e metas do mês.',
          )}
          checked={settings.financialAlerts}
          onChange={(value) => setSettings((current) => ({ ...current, financialAlerts: value }))}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.notifications.whatsappSummary', 'Resumo diário no WhatsApp')}
          description={t(
            'settings.notifications.whatsappSummaryDescription',
            'Envie um resumo diário com agenda e indicadores principais.',
          )}
          checked={settings.whatsappSummary}
          onChange={(value) => setSettings((current) => ({ ...current, whatsappSummary: value }))}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.notifications.marketingReports', 'Relatórios de marketing')}
          description={t(
            'settings.notifications.marketingReportsDescription',
            'Receba relatórios de desempenho das campanhas e captação.',
          )}
          checked={settings.marketingReports}
          onChange={(value) => setSettings((current) => ({ ...current, marketingReports: value }))}
          styles={styles}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => onSave(t('settings.toasts.notificationsSaved', 'Preferências de notificação salvas!'))}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
        >
          <Save className="h-4 w-4" />
          {t('settings.actions.savePreferences', 'Salvar preferências')}
        </button>
      </div>
    </div>
  );
}

function TeamSection({
  theme,
  t,
  styles,
  professionals,
  onSave,
  onAddProfessional,
  onUpdateProfessional,
  onDeleteProfessional,
}: TeamSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<any | null>(null);
  const [form, setForm] = useState<ProfessionalFormState>({
    name: '',
    specialty: '',
    email: '',
    phone: '',
    color: '#06b6d4',
    isActive: true,
  });

  const normalizedProfessionals = useMemo(
    () =>
      (professionals ?? []).map((professional, index) => ({
        id: professional?.id ?? String(index),
        name: professional?.name ?? '',
        specialty: professional?.specialty ?? professional?.role ?? '',
        email: professional?.email ?? '',
        phone: professional?.phone ?? '',
        color: professional?.color ?? '#06b6d4',
        isActive: professional?.isActive ?? professional?.active ?? true,
        raw: professional,
      })),
    [professionals],
  );

  const resetForm = () => {
    setForm({
      name: '',
      specialty: '',
      email: '',
      phone: '',
      color: '#06b6d4',
      isActive: true,
    });
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (professional: ProfessionalFormState) => {
    setForm(professional);
    setIsModalOpen(true);
  };

  const handleSaveProfessional = () => {
    const payload = {
      name: form.name,
      specialty: form.specialty,
      email: form.email,
      phone: form.phone,
      color: form.color,
      isActive: form.isActive,
      active: form.isActive,
    };

    if (!form.name.trim()) {
      onSave(t('settings.toasts.professionalNameRequired', 'Informe o nome do profissional.'));
      return;
    }

    if (form.id && onUpdateProfessional) {
      onUpdateProfessional(form.id, payload);
      onSave(t('settings.toasts.professionalUpdated', 'Profissional atualizado com sucesso!'));
    } else if (onAddProfessional) {
      onAddProfessional(payload);
      onSave(t('settings.toasts.professionalCreated', 'Profissional adicionado com sucesso!'));
    }

    setIsModalOpen(false);
    resetForm();
  };

  const confirmDeleteProfessional = () => {
    if (!professionalToDelete?.id || !onDeleteProfessional) {
      setProfessionalToDelete(null);
      return;
    }

    onDeleteProfessional(professionalToDelete.id);
    onSave(t('settings.toasts.professionalDeleted', 'Profissional removido com sucesso!'));
    setProfessionalToDelete(null);
  };

  const isDark = theme === 'dark';

  return (
    <>
      <div className={`rounded-3xl p-6 md:p-8 ${styles.panel}`}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <SectionHeader
            title={t('settings.sections.team.title', 'Equipe')}
            description={t(
              'settings.sections.team.description',
              'Gerencie profissionais, especialidades e permissões de atendimento.',
            )}
            styles={styles}
          />

          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4" />
            {t('settings.actions.addProfessional', 'Adicionar profissional')}
          </button>
        </div>

        {normalizedProfessionals.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-10 text-center ${styles.border}`}>
            <Users className={`mx-auto h-10 w-10 ${styles.textMuted}`} />
            <h3 className={`mt-4 text-lg font-semibold ${styles.text}`}>
              {t('settings.team.emptyTitle', 'Nenhum profissional cadastrado')}
            </h3>
            <p className={`mt-2 text-sm ${styles.textMuted}`}>
              {t(
                'settings.team.emptyDescription',
                'Adicione membros da equipe para organizar agenda, produção e atendimento.',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedProfessionals.map((professional) => (
              <div
                key={professional.id}
                className={`flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between ${styles.panelSoft}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-2xl"
                    style={{ backgroundColor: professional.color || '#06b6d4' }}
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-semibold ${styles.text}`}>{professional.name || '-'}</h3>
                      <span
                        className={
                          professional.isActive
                            ? `px-2.5 py-1 text-xs font-medium ${styles.successSoft}`
                            : `px-2.5 py-1 text-xs font-medium ${styles.dangerSoft}`
                        }
                      >
                        {professional.isActive
                          ? t('settings.team.status.active', 'Ativo')
                          : t('settings.team.status.inactive', 'Inativo')}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${styles.textMuted}`}>
                      {professional.specialty || t('settings.team.noSpecialty', 'Especialidade não informada')}
                    </p>
                    <div className={`mt-2 flex flex-wrap gap-3 text-xs ${styles.textMuted}`}>
                      {professional.email ? <span>{professional.email}</span> : null}
                      {professional.phone ? <span>{professional.phone}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(professional)}
                    className={styles.buttonSecondary}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      {t('settings.actions.edit', 'Editar')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfessionalToDelete(professional)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${styles.dangerSoft}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('settings.actions.remove', 'Remover')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${styles.overlay}`}>
          <div className={`w-full max-w-2xl rounded-3xl p-6 md:p-8 ${styles.panel}`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className={`text-xl font-bold ${styles.text}`}>
                  {form.id
                    ? t('settings.team.modal.editTitle', 'Editar profissional')
                    : t('settings.team.modal.addTitle', 'Adicionar profissional')}
                </h3>
                <p className={`mt-2 text-sm ${styles.textMuted}`}>
                  {t(
                    'settings.team.modal.description',
                    'Preencha as informações para organizar a equipe e a distribuição da agenda.',
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={styles.buttonSecondary}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t('settings.fields.name', 'Nome')}
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                styles={styles}
              />
              <Field
                label={t('settings.fields.specialty', 'Especialidade')}
                value={form.specialty}
                onChange={(value) => setForm((current) => ({ ...current, specialty: value }))}
                styles={styles}
              />
              <Field
                label={t('settings.fields.email', 'E-mail')}
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                styles={styles}
                type="email"
              />
              <Field
                label={t('settings.fields.phone', 'Telefone')}
                value={form.phone}
                onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                styles={styles}
              />
              <label className="space-y-2">
                <span className={`text-sm font-medium ${styles.textSoft}`}>
                  {t('settings.fields.color', 'Cor de identificação')}
                </span>
                <div className={`flex items-center gap-3 rounded-xl p-3 ${styles.panelSoft}`}>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    className="h-10 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <span className={`text-sm ${styles.textMuted}`}>{form.color}</span>
                </div>
              </label>
              <div className="space-y-2">
                <span className={`text-sm font-medium ${styles.textSoft}`}>
                  {t('settings.fields.status', 'Status')}
                </span>
                <div className={`flex items-center justify-between rounded-xl p-4 ${styles.panelSoft}`}>
                  <div>
                    <p className={`text-sm font-semibold ${styles.text}`}>
                      {form.isActive
                        ? t('settings.team.status.active', 'Ativo')
                        : t('settings.team.status.inactive', 'Inativo')}
                    </p>
                    <p className={`mt-1 text-sm ${styles.textMuted}`}>
                      {t(
                        'settings.team.statusDescription',
                        'Profissionais inativos não aparecem nas novas atribuições.',
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                    className={`relative h-7 w-12 rounded-full transition ${form.isActive ? 'bg-teal-500' : isDark ? 'bg-white/10' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        form.isActive ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={handleSaveProfessional}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                <Save className="h-4 w-4" />
                {t('settings.actions.saveProfessional', 'Salvar profissional')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {professionalToDelete ? (
        <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${styles.overlay}`}>
          <div className={`w-full max-w-lg rounded-3xl p-6 ${styles.panel}`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl p-3 ${styles.dangerSoft}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${styles.text}`}>
                  {t('settings.team.deleteTitle', 'Remover profissional')}
                </h3>
                <p className={`mt-2 text-sm ${styles.textMuted}`}>
                  {t(
                    'settings.team.deleteDescription',
                    'Tem certeza que deseja remover este profissional? Essa ação não pode ser desfeita.',
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfessionalToDelete(null)}
                className={styles.buttonSecondary}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfessional}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${styles.dangerSoft}`}
              >
                <Trash2 className="h-4 w-4" />
                {t('settings.actions.confirmRemove', 'Confirmar remoção')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BillingSection({ theme, t, styles, onSave }: BillingSectionProps) {
  const [billing, setBilling] = useState({
    plan: 'Professional',
    cycle: 'monthly',
    paymentMethod: 'Cartão •••• 4242',
    nextCharge: '15/10/2026',
    autoRenew: true,
    invoiceEmail: 'financeiro@clinicorganizerpro.com',
  });

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-3xl p-6 md:p-8 ${styles.panel}`}>
      <SectionHeader
        title={t('settings.sections.billing.title', 'Faturamento')}
        description={t(
          'settings.sections.billing.description',
          'Acompanhe o plano ativo, o método de pagamento e os dados de cobrança.',
        )}
        styles={styles}
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className={`rounded-3xl p-6 ${isDark ? 'bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20' : 'bg-gradient-to-br from-cyan-50 to-indigo-50 border border-cyan-100'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-sm ${styles.textMuted}`}>{t('settings.billing.currentPlan', 'Plano atual')}</p>
              <h3 className={`mt-2 text-2xl font-bold ${styles.text}`}>{billing.plan}</h3>
              <p className={`mt-2 text-sm ${styles.textMuted}`}>
                {t('settings.billing.planDescription', 'Ideal para clínicas em crescimento com equipe e automações.')}
              </p>
            </div>
            <span className={styles.badge}>{t('settings.billing.active', 'Ativo')}</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className={`rounded-2xl p-4 ${styles.panel}`}>
              <p className={`text-xs uppercase tracking-wide ${styles.textMuted}`}>
                {t('settings.billing.nextCharge', 'Próxima cobrança')}
              </p>
              <p className={`mt-2 text-lg font-semibold ${styles.text}`}>{billing.nextCharge}</p>
            </div>
            <div className={`rounded-2xl p-4 ${styles.panel}`}>
              <p className={`text-xs uppercase tracking-wide ${styles.textMuted}`}>
                {t('settings.billing.paymentMethod', 'Método de pagamento')}
              </p>
              <p className={`mt-2 text-lg font-semibold ${styles.text}`}>{billing.paymentMethod}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl p-6 ${styles.panelSoft}`}>
          <h3 className={`text-lg font-semibold ${styles.text}`}>
            {t('settings.billing.billingData', 'Dados de cobrança')}
          </h3>
          <div className="mt-4 space-y-4">
            <SelectField
              label={t('settings.billing.cycle', 'Ciclo')}
              value={billing.cycle}
              onChange={(value) => setBilling((current) => ({ ...current, cycle: value }))}
              options={[
                { value: 'monthly', label: t('settings.billing.monthly', 'Mensal') },
                { value: 'yearly', label: t('settings.billing.yearly', 'Anual') },
              ]}
              styles={styles}
            />
            <Field
              label={t('settings.billing.invoiceEmail', 'E-mail para nota fiscal')}
              value={billing.invoiceEmail}
              onChange={(value) => setBilling((current) => ({ ...current, invoiceEmail: value }))}
              styles={styles}
            />
            <ToggleRow
              label={t('settings.billing.autoRenew', 'Renovação automática')}
              description={t(
                'settings.billing.autoRenewDescription',
                'Mantenha o plano ativo e evite interrupções no acesso.',
              )}
              checked={billing.autoRenew}
              onChange={(value) => setBilling((current) => ({ ...current, autoRenew: value }))}
              styles={styles}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => onSave(t('settings.toasts.billingSaved', 'Configurações de faturamento atualizadas!'))}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
        >
          <Save className="h-4 w-4" />
          {t('settings.actions.saveBilling', 'Salvar faturamento')}
        </button>
      </div>
    </div>
  );
}

function SecuritySection({ theme, t, styles, onSave, signOut }: SecuritySectionProps) {
  const [settings, setSettings] = useState({
    twoFactor: false,
    loginAlerts: true,
    allowMultipleSessions: false,
    sessionTimeout: '30',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isDark = theme === 'dark';

  const handleSignOut = async () => {
    if (isSigningOut || !signOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={`rounded-3xl p-6 md:p-8 ${styles.panel}`}>
      <SectionHeader
        title={t('settings.sections.security.title', 'Segurança')}
        description={t(
          'settings.sections.security.description',
          'Controle acesso, sessões e boas práticas de proteção da conta.',
        )}
        styles={styles}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <ToggleRow
            label={t('settings.security.twoFactor', 'Autenticação em dois fatores')}
            description={t(
              'settings.security.twoFactorDescription',
              'Adicione uma camada extra de proteção ao login da conta.',
            )}
            checked={settings.twoFactor}
            onChange={(value) => setSettings((current) => ({ ...current, twoFactor: value }))}
            styles={styles}
          />
          <ToggleRow
            label={t('settings.security.loginAlerts', 'Alertas de login')}
            description={t(
              'settings.security.loginAlertsDescription',
              'Receba notificações sempre que um novo acesso for detectado.',
            )}
            checked={settings.loginAlerts}
            onChange={(value) => setSettings((current) => ({ ...current, loginAlerts: value }))}
            styles={styles}
          />
          <ToggleRow
            label={t('settings.security.allowMultipleSessions', 'Permitir múltiplas sessões')}
            description={t(
              'settings.security.allowMultipleSessionsDescription',
              'Mantenha o acesso em mais de um dispositivo simultaneamente.',
            )}
            checked={settings.allowMultipleSessions}
            onChange={(value) => setSettings((current) => ({ ...current, allowMultipleSessions: value }))}
            styles={styles}
          />
          <SelectField
            label={t('settings.security.sessionTimeout', 'Tempo para expiração da sessão')}
            value={settings.sessionTimeout}
            onChange={(value) => setSettings((current) => ({ ...current, sessionTimeout: value }))}
            options={[
              { value: '15', label: `15 ${t('common.minutes', 'minutos')}` },
              { value: '30', label: `30 ${t('common.minutes', 'minutos')}` },
              { value: '60', label: `60 ${t('common.minutes', 'minutos')}` },
            ]}
            styles={styles}
          />
        </div>

        <div className={`rounded-3xl p-6 ${styles.panelSoft}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-semibold ${styles.text}`}>
                {t('settings.security.changePassword', 'Alterar senha')}
              </h3>
              <p className={`mt-1 text-sm ${styles.textMuted}`}>
                {t('settings.security.changePasswordDescription', 'Use uma senha forte e exclusiva para a sua conta.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              className={styles.buttonSecondary}
            >
              <span className="inline-flex items-center gap-2">
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPasswords
                  ? t('settings.security.hide', 'Ocultar')
                  : t('settings.security.show', 'Mostrar')}
              </span>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <Field
              label={t('settings.security.currentPassword', 'Senha atual')}
              value={settings.currentPassword}
              onChange={(value) => setSettings((current) => ({ ...current, currentPassword: value }))}
              styles={styles}
              type={showPasswords ? 'text' : 'password'}
            />
            <Field
              label={t('settings.security.newPassword', 'Nova senha')}
              value={settings.newPassword}
              onChange={(value) => setSettings((current) => ({ ...current, newPassword: value }))}
              styles={styles}
              type={showPasswords ? 'text' : 'password'}
            />
            <Field
              label={t('settings.security.confirmPassword', 'Confirmar nova senha')}
              value={settings.confirmPassword}
              onChange={(value) => setSettings((current) => ({ ...current, confirmPassword: value }))}
              styles={styles}
              type={showPasswords ? 'text' : 'password'}
            />
          </div>

          <div className={`mt-5 rounded-2xl p-4 ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-700'}`}>
            <p className="text-sm">
              {t(
                'settings.security.passwordTip',
                'Dica: combine letras maiúsculas, minúsculas, números e símbolos para aumentar a segurança.',
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${isDark ? 'border border-rose-700 text-rose-400 hover:bg-rose-900/30 disabled:border-zinc-700 disabled:text-zinc-600' : 'border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:border-slate-200 disabled:text-slate-400'} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label="Log out"
          title={isSigningOut ? 'Signing out...' : 'Log out'}
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? t('settings.actions.signingOut', 'Desconectando…') : t('settings.actions.logout', 'Fazer logout')}
        </button>
        <button
          type="button"
          onClick={() => onSave(t('settings.toasts.securitySaved', 'Configurações de segurança atualizadas!'))}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('settings.actions.saveSecurity', 'Salvar segurança')}
        </button>
      </div>
    </div>
  );
}

export function Configuracoes() {
  const app = useApp() as any;
  const theme = (app.theme ?? 'dark') as ThemeMode;
  const t = (app.t ?? ((_: string, fallback: string) => fallback)) as (path: string, fallback: string) => string;
  const professionals = (app.professionals ?? []) as any[];
  const styles = getThemeClasses(theme);

  const [activeSection, setActiveSection] = useState<SettingsSection>('clinic');

  const handleToast = (message: string) => {
    try {
      app.showToast?.(message, 'success');
    } catch {
      try {
        app.showToast?.({ message, type: 'success' });
      } catch {
        // noop
      }
    }
  };

  const sections = [
    {
      key: 'clinic' as const,
      label: t('settings.nav.clinic', 'Clínica'),
      icon: Building2,
      description: t('settings.nav.clinicDescription', 'Dados gerais e preferências'),
    },
    {
      key: 'notifications' as const,
      label: t('settings.nav.notifications', 'Notificações'),
      icon: Bell,
      description: t('settings.nav.notificationsDescription', 'Alertas e lembretes'),
    },
    {
      key: 'team' as const,
      label: t('settings.nav.team', 'Equipe'),
      icon: Users,
      description: t('settings.nav.teamDescription', 'Profissionais e acesso'),
    },
    {
      key: 'billing' as const,
      label: t('settings.nav.billing', 'Faturamento'),
      icon: CreditCard,
      description: t('settings.nav.billingDescription', 'Plano e cobrança'),
    },
    {
      key: 'security' as const,
      label: t('settings.nav.security', 'Segurança'),
      icon: Shield,
      description: t('settings.nav.securityDescription', 'Acesso e proteção'),
    },
  ];

  return (
    <div className={`min-h-full p-4 md:p-6 ${styles.page}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className={styles.badge}>{t('settings.badge', 'Administração do sistema')}</span>
            <h1 className={`mt-3 text-3xl font-bold ${styles.text}`}>
              {t('settings.title', 'Configurações')}
            </h1>
            <p className={`mt-2 text-sm ${styles.textMuted}`}>
              {t(
                'settings.subtitle',
                'Personalize dados da clínica, equipe, faturamento, notificações e segurança.',
              )}
            </p>
          </div>

          <div className={`rounded-2xl px-4 py-3 ${styles.panel}`}>
            <p className={`text-xs uppercase tracking-wide ${styles.textMuted}`}>
              {t('settings.summary.activeProfessionals', 'Profissionais ativos')}
            </p>
            <p className={`mt-1 text-2xl font-bold ${styles.text}`}>
              {professionals.filter((professional) => professional?.isActive ?? professional?.active ?? true).length}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`h-fit rounded-3xl p-4 ${styles.panel}`}>
            <div className="mb-4 px-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${styles.textMuted}`}>
                {t('settings.nav.title', 'Seções')}
              </p>
            </div>

            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={isActive ? styles.navItemActive : styles.navItem}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate">{section.label}</span>
                      <span className={`mt-1 block truncate text-xs ${styles.textMuted}`}>
                        {section.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0">
            {activeSection === 'clinic' ? (
              <ClinicSection theme={theme} t={t} styles={styles} onSave={handleToast} />
            ) : null}
            {activeSection === 'notifications' ? (
              <NotificationsSection theme={theme} t={t} styles={styles} onSave={handleToast} />
            ) : null}
            {activeSection === 'team' ? (
              <TeamSection
                theme={theme}
                t={t}
                styles={styles}
                professionals={professionals}
                onSave={handleToast}
                onAddProfessional={app.addProfessional}
                onUpdateProfessional={app.updateProfessional}
                onDeleteProfessional={app.deleteProfessional}
              />
            ) : null}
            {activeSection === 'billing' ? (
              <BillingSection theme={theme} t={t} styles={styles} onSave={handleToast} />
            ) : null}
            {activeSection === 'security' ? (
              <SecuritySection theme={theme} t={t} styles={styles} onSave={handleToast} signOut={app.signOut} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
