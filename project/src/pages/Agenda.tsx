import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useLayout } from '../context/LayoutContext';
import { Appointment } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/layout/BackButton';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import InsightsSummary from '../components/ai/InsightsSummary';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function escapeICSText(s: string) {
  // ICS: escape vírgula, ponto e vírgula e quebras de linha
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildMonthICS(opts: {
  appointments: Appointment[];
  monthYearLabel: string;
}) {
  const { appointments, monthYearLabel } = opts;

  // DTSTART/DTEND com formato local sem Z: YYYYMMDDTHHMMSS
  // Como os agendamentos salvam apenas date+time (sem fuso), vamos usar horário “local do servidor/browser”
  // com offset embutido no arquivo via DTSTART;TZID. Muitos clientes aceitam.
  const toICSDateTime = (ymd: string, time: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return `${y}${pad2(m)}${pad2(d)}T${pad2(hh)}${pad2(mm)}00`;
  };

  const toDTEND = (ymd: string, time: string, durationMinutes: number) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(y, m - 1, d, hh, mm, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return `${end.getFullYear()}${pad2(end.getMonth() + 1)}${pad2(end.getDate())}T${pad2(end.getHours())}${pad2(end.getMinutes())}00`;
  };


  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Clinic Organizer Pro SaaS//AGENDA//PT-BR');
  lines.push('CALSCALE:GREGORIAN');
  lines.push(`X-WR-CALNAME:${escapeICSText(monthYearLabel)}`);

  // UID por appointment
  for (const a of appointments) {
    // ICS: SUMMARY + DESCRIPTION
    const dtStart = toICSDateTime(a.date, a.time);
    const dtEnd = toDTEND(a.date, a.time, a.duration);

    const summary = `${a.patientName} — ${a.procedure}`;
    const desc = `Profissional: ${a.professional}\\nStatus: ${a.status}\\nValor: R$ ${a.value.toFixed(2)}\\nObs: ${a.notes ?? ''}`;

    lines.push('BEGIN:VEVENT');
    // Usando TZ offset via DTSTART;TZID=UTC±HH:MM (clientes modernos ignoram/aceitam)
    // Para compatibilidade, colocamos também o sufixo Z se o cliente exigir — mas isso mudaria fuso.
    // Vamos manter sem Z.
    lines.push(`UID:${a.id}@clinic-organizer-pro`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICSText(summary)}`);
    lines.push(`DESCRIPTION:${escapeICSText(desc)}`);
    // Location vazio (poderia ser clínca)
    lines.push('LOCATION:');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'error' | 'teal' }> = {
  confirmed: { label: 'Confirmado', variant: 'success' },
  scheduled: { label: 'Agendado', variant: 'info' },
  completed: { label: 'Concluído', variant: 'teal' },
  cancelled: { label: 'Cancelado', variant: 'error' },
  'no-show': { label: 'Não compareceu', variant: 'warning' },
};

const weekDayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const PROCEDURES = [
  'Botox',
  'Preenchimento Labial',
  'Harmonização Facial',
  'Microagulhamento',
  'Peeling Químico',
  'Bioestimulador',
  'Limpeza de Pele',
  'Consulta de Avaliação',
];

// ─── Field helpers ────────────────────────────────────────────────────────────
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.07)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none"
      style={inputStyle}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: '#0d0e14' }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Appointment form modal ───────────────────────────────────────────────────
type ApptForm = {
  patientId: string;
  patientName: string;
  procedure: string;
  date: string;
  time: string;
  duration: number;
  professional: string;
  status: Appointment['status'];
  value: number;
  notes: string;
};

function formatDateYMD(year: number, monthIndex0: number, dayOfMonth: number) {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(dayOfMonth)}`;
}

function parseYMD(dateStr: string): { y: number; m: number; d: number } | null {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

function addMonths(year: number, monthIndex0: number, delta: number) {
  const base = new Date(year, monthIndex0, 1);
  base.setMonth(base.getMonth() + delta);
  return { year: base.getFullYear(), monthIndex0: base.getMonth() };
}

function ApptFormModal({
  open,
  onClose,
  initial,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Appointment;
  defaultDate?: string;
}) {
  const { patients, professionals, addAppointment, updateAppointment } = useApp();
  const activeProfessionals = useMemo(
    () => professionals.filter((professional) => professional.active),
    [professionals],
  );
  const professionalOptions = useMemo(
    () =>
      activeProfessionals.map((professional) => ({
        value: professional.name,
        label: professional.specialty ? `${professional.name} — ${professional.specialty}` : professional.name,
      })),
    [activeProfessionals],
  );

  const [form, setForm] = useState<ApptForm>(
    initial
      ? {
          patientId: initial.patientId,
          patientName: initial.patientName,
          procedure: initial.procedure,
          date: initial.date,
          time: initial.time,
          duration: initial.duration,
          professional: initial.professional,
          status: initial.status,
          value: initial.value,
          notes: initial.notes ?? '',
        }
      : {
          patientId: '',
          patientName: '',
          procedure: PROCEDURES[0],
          date: defaultDate ?? new Date().toISOString().split('T')[0],
          time: '09:00',
          duration: 60,
          professional: '',
          status: 'scheduled',
          value: 0,
          notes: '',
        },
  );

  const [saving, setSaving] = useState(false);

  function setF<K extends keyof ApptForm>(k: K, v: ApptForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handlePatientChange(id: string) {
    const p = patients.find((p2) => p2.id === id);
    setForm((f) => ({ ...f, patientId: id, patientName: p?.name ?? '' }));
  }

  async function handleSave() {
    if (!form.patientName || !form.date || !form.professional) return;
    setSaving(true);
    try {
      if (initial) await updateAppointment(initial.id, form);
      else await addAppointment(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar Consulta' : 'Nova Consulta'}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.patientName}>
            {initial ? 'Salvar' : 'Agendar'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Paciente *">
            {patients.length > 0 ? (
              <SelectField
                value={form.patientId}
                onChange={handlePatientChange}
                options={[
                  { value: '', label: 'Selecionar paciente...' },
                  ...patients.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            ) : (
              <Input value={form.patientName} onChange={(v) => setF('patientName', v)} placeholder="Nome do paciente" />
            )}
          </Field>
        </div>

        <Field label="Procedimento">
          <SelectField value={form.procedure} onChange={(v) => setF('procedure', v)} options={PROCEDURES.map((p) => ({ value: p, label: p }))} />
        </Field>

        <Field label="Profissional">
          {professionalOptions.length > 0 ? (
            <SelectField
              value={form.professional}
              onChange={(v) => setF('professional', v)}
              options={[
                { value: '', label: 'Selecionar profissional...' },
                ...professionalOptions,
              ]}
            />
          ) : (
            <div className="space-y-2">
              <SelectField value="" onChange={() => {}} options={[{ value: '', label: 'Cadastre profissionais na configuração de equipe' }]} />
              <p className="text-[11px] text-zinc-600">Só profissionais adicionados em Configurações de Equipe aparecem na agenda.</p>
            </div>
          )}
        </Field>

        <Field label="Data">
          <Input value={form.date} onChange={(v) => setF('date', v)} type="date" />
        </Field>

        <Field label="Horário">
          <Input value={form.time} onChange={(v) => setF('time', v)} type="time" />
        </Field>

        <Field label="Duração (min)">
          <Input value={String(form.duration)} onChange={(v) => setF('duration', Number(v))} type="number" placeholder="60" />
        </Field>

        <Field label="Valor (R$)">
          <Input value={String(form.value)} onChange={(v) => setF('value', Number(v))} type="number" placeholder="0.00" />
        </Field>

        <Field label="Status">
          <SelectField
            value={form.status}
            onChange={(v) => setF('status', v as Appointment['status'])}
            options={[
              { value: 'scheduled', label: 'Agendado' },
              { value: 'confirmed', label: 'Confirmado' },
              { value: 'completed', label: 'Concluído' },
              { value: 'cancelled', label: 'Cancelado' },
              { value: 'no-show', label: 'Não compareceu' },
            ]}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setF('notes', e.target.value)}
              placeholder="Anotações..."
              className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-none"
              style={inputStyle}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────
function AppointmentCard({
  appt,
  patientPhoto,
  onOpenPatient,
  onEdit,
  onDelete,
}: {
  appt: Appointment;
  patientPhoto?: string;
  onOpenPatient: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = statusMap[appt.status];
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl group transition-all duration-200 row-interactive">
      <button
        type="button"
        onClick={onOpenPatient}
        className="flex-shrink-0 text-center w-[56px] py-2 rounded-xl transition-all hover:scale-[1.02]"
        style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.14)' }}
        title="Abrir prontuário do paciente"
      >
        <p className="text-[12px] font-bold text-teal-400 leading-none">{appt.time}</p>
        <p className="text-[10px] text-zinc-600 mt-1">{appt.duration}m</p>
      </button>

      <Avatar name={appt.patientName} src={patientPhoto} size="sm" />

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenPatient}
          className="block max-w-full truncate text-left text-[13px] font-semibold text-zinc-200 tracking-tight transition-colors hover:text-teal-300"
          title="Abrir prontuário do paciente"
        >
          {appt.patientName}
        </button>
        <p className="text-[11px] text-zinc-500 mt-0.5">{appt.procedure}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <User size={9} className="text-zinc-700" />
          <span className="text-[10px] text-zinc-600">{appt.professional}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-[12px] font-bold text-zinc-300 tracking-tight">{formatCurrency(appt.value)}</span>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <InsightsSummary appointment={appt} />
        <button onClick={onEdit} className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Agenda() {
  const { appointments, deleteAppointment, patients } = useApp();
  const { navigate, pageParams } = useLayout();

  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex0, setViewMonthIndex0] = useState(now.getMonth()); // 0..11

  const defaultSelectedYMD = formatDateYMD(now.getFullYear(), now.getMonth(), now.getDate());
  const [selectedYMD, setSelectedYMD] = useState<string>(defaultSelectedYMD);

  useEffect(() => {
    if (!pageParams || typeof pageParams.date !== 'string') return;
    const parsed = parseYMD(pageParams.date);
    if (!parsed) return;

    const monthIndex0 = parsed.m - 1;
    if (monthIndex0 < 0 || monthIndex0 > 11) return;

    setViewYear(parsed.y);
    setViewMonthIndex0(monthIndex0);
    setSelectedYMD(pageParams.date);
  }, [pageParams]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Appointment | null>(null);

  // Não há popover do dia — manter compatibilidade com modais de criação/edição/exclusão
  useEffect(() => {
    // intencionalmente vazio
  }, [createOpen, editAppt, deleteConfirm]);

  const monthLabel = monthFormatter.format(new Date(viewYear, viewMonthIndex0, 1));

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedYMD)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedYMD]);

  const totalValue = dayAppointments.reduce((s, a) => s + a.value, 0);

  const patientByAppointment = useCallback(
    (appointment: Appointment) =>
      patients.find((patient) => patient.id === appointment.patientId) ??
      patients.find((patient) => patient.name.trim().toLowerCase() === appointment.patientName.trim().toLowerCase()) ??
      null,
    [patients],
  );

  const openPatientRecord = useCallback(
    (appointment: Appointment) => {
      const patient = patientByAppointment(appointment);
      if (!patient) return;
      navigate('pacientes', { patientId: patient.id, startAttendance: true });
    },
    [navigate, patientByAppointment],
  );

  const upcoming = useMemo(() => {
    return appointments
      .filter((a) => a.date > selectedYMD)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [appointments, selectedYMD]);

  const selectedParts = useMemo(() => parseYMD(selectedYMD), [selectedYMD]);
  const selectedDayNum = selectedParts?.d ?? now.getDate();
  const selectedMonthNum = selectedParts?.m ?? viewMonthIndex0 + 1;

  const viewGridCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonthIndex0, 1);
    const firstWeekday = firstDay.getDay(); // 0..6 dom..sáb

    return Array.from({ length: 42 }, (_, i) => {
      const dayOffset = i - firstWeekday;
      const cellDate = new Date(viewYear, viewMonthIndex0, 1 + dayOffset);

      const inMonth = cellDate.getMonth() === viewMonthIndex0;
      const cellYMD = formatDateYMD(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());

      const hasAppts = appointments.some((a) => a.date === cellYMD);
      const isSelected = cellYMD === selectedYMD;

      const isToday =
        cellDate.getFullYear() === now.getFullYear() &&
        cellDate.getMonth() === now.getMonth() &&
        cellDate.getDate() === now.getDate();

      return {
        cellYMD,
        inMonth,
        dNum: cellDate.getDate(),
        hasAppts,
        isSelected,
        isToday,
        mIndex0: cellDate.getMonth(),
      };
    });
  }, [appointments, now, selectedYMD, viewMonthIndex0, viewYear]);

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Agenda</h2>
            <BackButton to="dashboard" />
          </div>
          <p className="text-[13px] text-zinc-500 mt-2">Gerenciamento de consultas e procedimentos</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Nova Consulta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h3 className="text-[13px] font-bold text-zinc-200 tracking-tight capitalize">{monthLabel}</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const monthStart = `${viewYear}-${String(viewMonthIndex0 + 1).padStart(2, '0')}-01`;
                  const next = addMonths(viewYear, viewMonthIndex0, 1);
                  const monthEnd = `${next.year}-${String(next.monthIndex0 + 1).padStart(2, '0')}-01`;

                  const monthAppointments = appointments.filter((a) => a.date >= monthStart && a.date < monthEnd);

                  const ics = buildMonthICS({
                    appointments: monthAppointments,
                    monthYearLabel: monthLabel,
                  });

                  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                  const url = URL.createObjectURL(blob);

                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `agenda-${viewYear}-${String(viewMonthIndex0 + 1).padStart(2, '0')}.ics`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();

                  URL.revokeObjectURL(url);
                }}
              >
                Exportar (ICS)
              </Button>

              <div className="flex gap-1">
                <button
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-all hover:bg-white/5"
                  onClick={() => {
                    const prev = addMonths(viewYear, viewMonthIndex0, -1);
                    setViewYear(prev.year);
                    setViewMonthIndex0(prev.monthIndex0);
                  }}
                  aria-label="Mês anterior"
                  type="button"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-all hover:bg-white/5"
                  onClick={() => {
                    const next = addMonths(viewYear, viewMonthIndex0, 1);
                    setViewYear(next.year);
                    setViewMonthIndex0(next.monthIndex0);
                  }}
                  aria-label="Próximo mês"
                  type="button"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekDayLabels.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-zinc-700 py-1 font-bold">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {viewGridCells.map((c) => (
              <button
                key={c.cellYMD}
                onClick={() => {
                  setSelectedYMD(c.cellYMD);
                }}
                className="relative aspect-square rounded-lg text-[11px] transition-all duration-150 flex flex-col items-center justify-center"
                style={{
                  background: c.isSelected
                    ? 'linear-gradient(135deg, #14b8a6, #0d9488)'
                    : c.isToday
                      ? 'rgba(255,255,255,0.08)'
                      : 'transparent',
                  color: c.isSelected ? '#fff' : c.inMonth ? (c.isToday ? '#e4e4e7' : '#52525b') : '#3f3f46',
                  boxShadow: c.isSelected ? '0 4px 14px rgba(20,184,166,0.38)' : 'none',
                  fontWeight: c.isSelected || c.isToday ? '700' : '500',
                  opacity: c.inMonth ? 1 : 0.65,
                }}
                aria-label={`Selecionar dia ${c.dNum}/${c.mIndex0 + 1}`}
                type="button"
              >
                {c.dNum}
                {c.hasAppts && !c.isSelected && (
                  <span
                    className="w-1 h-1 rounded-full absolute bottom-1"
                    style={{ background: c.isToday ? '#5eead4' : 'rgba(20,184,166,0.45)' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="mt-5 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-600">
                Dia {selectedDayNum}/{pad2(selectedMonthNum)}
              </span>
              <span className="text-[12px] font-bold text-zinc-300">{dayAppointments.length} consultas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-600">Receita estimada</span>
              <span className="text-[12px] font-bold text-emerald-400">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </Card>

        {/* Appointments list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-200 tracking-tight">
                {dayAppointments.length > 0
                  ? `${dayAppointments.length} consulta${dayAppointments.length > 1 ? 's' : ''} — dia ${selectedDayNum}`
                  : `Sem consultas — dia ${selectedDayNum}`}
              </h3>
              {totalValue > 0 && (
                <p className="text-[12px] text-zinc-500 mt-0.5 flex items-center gap-1.5 font-medium">
                  <Clock size={11} className="text-teal-600" /> {formatCurrency(totalValue)} estimado
                </p>
              )}
            </div>
          </div>

          {dayAppointments.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <CalendarDays size={24} className="text-zinc-600" />
              </div>
              <p className="text-[13px] font-semibold text-zinc-400">Nenhuma consulta agendada</p>
              <p className="text-[11px] text-zinc-700 mt-1">Clique em "Nova Consulta" para adicionar</p>
              <Button size="sm" className="mt-4" icon={<Plus size={12} />} onClick={() => setCreateOpen(true)}>
                Agendar
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map((appt) => {
                const patient = patientByAppointment(appt);
                return (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    patientPhoto={patient?.profilePhoto}
                    onOpenPatient={() => openPatientRecord(appt)}
                    onEdit={() => setEditAppt(appt)}
                    onDelete={() => setDeleteConfirm(appt)}
                  />
                );
              })}
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-700 mb-3 mt-2 px-1">
                Próximas consultas
              </p>
              <div className="space-y-1.5">
                {upcoming.map((appt) => {
                  const patient = patientByAppointment(appt);
                  return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => openPatientRecord(appt)}
                    className="flex w-full items-center gap-3 p-3 rounded-xl cursor-pointer row-interactive text-left"
                    title="Abrir prontuário do paciente"
                  >
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-[12px] font-bold text-zinc-400">
                        {appt.date.split('-')[2]}/{appt.date.split('-')[1]}
                      </p>
                      <p className="text-[10px] text-zinc-600">{appt.time}</p>
                    </div>
                    <Avatar name={appt.patientName} src={patient?.profilePhoto} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-300 truncate tracking-tight">{appt.patientName}</p>
                      <p className="text-[11px] text-zinc-600 truncate">{appt.procedure}</p>
                    </div>
                    <Badge variant={statusMap[appt.status].variant}>{statusMap[appt.status].label}</Badge>
                  </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <ApptFormModal open={createOpen} onClose={() => setCreateOpen(false)} defaultDate={selectedYMD} />
      {editAppt && <ApptFormModal open={!!editAppt} onClose={() => setEditAppt(null)} initial={editAppt} />}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir consulta"
        description={`Remover consulta de "${deleteConfirm?.patientName}" em ${deleteConfirm?.date} às ${deleteConfirm?.time}?`}
        confirmLabel="Sim, excluir"
        onConfirm={async () => {
          if (deleteConfirm) {
            await deleteAppointment(deleteConfirm.id);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
