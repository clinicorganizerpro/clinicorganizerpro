import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { Appointment } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'error' | 'teal' }> = {
  confirmed: { label: 'Confirmado', variant: 'success' },
  scheduled: { label: 'Agendado', variant: 'info' },
  completed: { label: 'Concluído', variant: 'teal' },
  cancelled: { label: 'Cancelado', variant: 'error' },
  'no-show': { label: 'Não compareceu', variant: 'warning' },
};

const monthDays = Array.from({ length: 30 }, (_, i) => i + 1);
const weekDayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const PROFESSIONALS = ['Dra. Camila Rocha', 'Dr. Rafael Lima'];
const PROCEDURES = ['Botox', 'Preenchimento Labial', 'Harmonização Facial', 'Microagulhamento', 'Peeling Químico', 'Bioestimulador', 'Limpeza de Pele', 'Consulta de Avaliação'];

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

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = 'rgba(20,184,166,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.07)'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none"
      style={inputStyle}
    >
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0d0e14' }}>{o.label}</option>)}
    </select>
  );
}

// ─── Appointment form modal ───────────────────────────────────────────────────
type ApptForm = {
  patientId: string; patientName: string; procedure: string; date: string;
  time: string; duration: number; professional: string;
  status: Appointment['status']; value: number; notes: string;
};

function ApptFormModal({ open, onClose, initial, defaultDate }: {
  open: boolean; onClose: () => void; initial?: Appointment; defaultDate?: string;
}) {
  const { patients, addAppointment, updateAppointment } = useApp();
  const [form, setForm] = useState<ApptForm>(initial ? {
    patientId: initial.patientId, patientName: initial.patientName,
    procedure: initial.procedure, date: initial.date, time: initial.time,
    duration: initial.duration, professional: initial.professional,
    status: initial.status, value: initial.value, notes: initial.notes ?? '',
  } : {
    patientId: '', patientName: '', procedure: PROCEDURES[0],
    date: defaultDate ?? new Date().toISOString().split('T')[0],
    time: '09:00', duration: 60, professional: PROFESSIONALS[0],
    status: 'scheduled', value: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);

  function setF<K extends keyof ApptForm>(k: K, v: ApptForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handlePatientChange(id: string) {
    const p = patients.find(p => p.id === id);
    setForm(f => ({ ...f, patientId: id, patientName: p?.name ?? '' }));
  }

  async function handleSave() {
    if (!form.patientName || !form.date) return;
    setSaving(true);
    if (initial) await updateAppointment(initial.id, form);
    else await addAppointment(form);
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={initial ? 'Editar Consulta' : 'Nova Consulta'}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
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
                  ...patients.map(p => ({ value: p.id, label: p.name })),
                ]}
              />
            ) : (
              <Input value={form.patientName} onChange={v => setF('patientName', v)} placeholder="Nome do paciente" />
            )}
          </Field>
        </div>
        <Field label="Procedimento">
          <SelectField value={form.procedure} onChange={v => setF('procedure', v)} options={PROCEDURES.map(p => ({ value: p, label: p }))} />
        </Field>
        <Field label="Profissional">
          <SelectField value={form.professional} onChange={v => setF('professional', v)} options={PROFESSIONALS.map(p => ({ value: p, label: p }))} />
        </Field>
        <Field label="Data">
          <Input value={form.date} onChange={v => setF('date', v)} type="date" />
        </Field>
        <Field label="Horário">
          <Input value={form.time} onChange={v => setF('time', v)} type="time" />
        </Field>
        <Field label="Duração (min)">
          <Input value={String(form.duration)} onChange={v => setF('duration', Number(v))} type="number" placeholder="60" />
        </Field>
        <Field label="Valor (R$)">
          <Input value={String(form.value)} onChange={v => setF('value', Number(v))} type="number" placeholder="0.00" />
        </Field>
        <Field label="Status">
          <SelectField value={form.status} onChange={v => setF('status', v as Appointment['status'])} options={[
            { value: 'scheduled', label: 'Agendado' },
            { value: 'confirmed', label: 'Confirmado' },
            { value: 'completed', label: 'Concluído' },
            { value: 'cancelled', label: 'Cancelado' },
            { value: 'no-show', label: 'Não compareceu' },
          ]} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea
              rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)}
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
function AppointmentCard({ appt, onEdit, onDelete }: {
  appt: Appointment; onEdit: () => void; onDelete: () => void;
}) {
  const status = statusMap[appt.status];
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl group transition-all duration-200 row-interactive"
    >
      <div className="flex-shrink-0 text-center w-[56px] py-2 rounded-xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.14)' }}>
        <p className="text-[12px] font-bold text-teal-400 leading-none">{appt.time}</p>
        <p className="text-[10px] text-zinc-600 mt-1">{appt.duration}m</p>
      </div>
      <Avatar name={appt.patientName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-zinc-200 tracking-tight">{appt.patientName}</p>
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
        <button onClick={onEdit} className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Pencil size={13} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Agenda() {
  const { appointments, deleteAppointment } = useApp();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [selectedDay, setSelectedDay] = useState(now.getDate() <= 30 ? now.getDate() : 16);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Appointment | null>(null);

  const monthLabel = monthFormatter.format(new Date(currentYear, currentMonth - 1, 1));
  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayAppointments = useMemo(() => appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time)), [appointments, dateStr]);
  const totalValue = dayAppointments.reduce((s, a) => s + a.value, 0);
  const upcoming = useMemo(() => appointments.filter(a => a.date > dateStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4), [appointments, dateStr]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Agenda</h2>
          <p className="text-[13px] text-zinc-500 mt-2">Gerenciamento de consultas e procedimentos</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Nova Consulta</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-bold text-zinc-200 tracking-tight capitalize">{monthLabel}</h3>
            <div className="flex gap-1">
              <button className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-all hover:bg-white/5"><ChevronLeft size={14} /></button>
              <button className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-all hover:bg-white/5"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekDayLabels.map((d, i) => <div key={i} className="text-center text-[10px] text-zinc-700 py-1 font-bold">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            <div />
            {monthDays.map(day => {
              const ds = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasAppts = appointments.some(a => a.date === ds);
              const isSelected = day === selectedDay;
              const isToday = day === now.getDate();
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="relative aspect-square rounded-lg text-[11px] transition-all duration-150 flex flex-col items-center justify-center"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : isToday ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? '#e4e4e7' : '#52525b',
                    boxShadow: isSelected ? '0 4px 14px rgba(20,184,166,0.38)' : 'none',
                    fontWeight: isSelected || isToday ? '700' : '500',
                  }}
                >
                  {day}
                  {hasAppts && !isSelected && (
                    <span className="w-1 h-1 rounded-full absolute bottom-1" style={{ background: isToday ? '#5eead4' : 'rgba(20,184,166,0.45)' }} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-5 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex justify-between">
              <span className="text-[12px] text-zinc-600">Dia {selectedDay}/{String(currentMonth).padStart(2, '0')}</span>
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
                  ? `${dayAppointments.length} consulta${dayAppointments.length > 1 ? 's' : ''} — dia ${selectedDay}`
                  : `Sem consultas — dia ${selectedDay}`}
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
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <CalendarDays size={24} className="text-zinc-600" />
              </div>
              <p className="text-[13px] font-semibold text-zinc-400">Nenhuma consulta agendada</p>
              <p className="text-[11px] text-zinc-700 mt-1">Clique em "Nova Consulta" para adicionar</p>
              <Button size="sm" className="mt-4" icon={<Plus size={12} />} onClick={() => setCreateOpen(true)}>Agendar</Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map(appt => (
                <AppointmentCard
                  key={appt.id} appt={appt}
                  onEdit={() => setEditAppt(appt)}
                  onDelete={() => setDeleteConfirm(appt)}
                />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-700 mb-3 mt-2 px-1">Próximas consultas</p>
              <div className="space-y-1.5">
                {upcoming.map(appt => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer row-interactive"
                  >
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-[12px] font-bold text-zinc-400">{appt.date.split('-')[2]}/{appt.date.split('-')[1]}</p>
                      <p className="text-[10px] text-zinc-600">{appt.time}</p>
                    </div>
                    <Avatar name={appt.patientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-300 truncate tracking-tight">{appt.patientName}</p>
                      <p className="text-[11px] text-zinc-600 truncate">{appt.procedure}</p>
                    </div>
                    <Badge variant={statusMap[appt.status].variant}>{statusMap[appt.status].label}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ApptFormModal open={createOpen} onClose={() => setCreateOpen(false)} defaultDate={dateStr} />
      {editAppt && <ApptFormModal open={!!editAppt} onClose={() => setEditAppt(null)} initial={editAppt} />}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir consulta"
        description={`Remover consulta de "${deleteConfirm?.patientName}" em ${deleteConfirm?.date} às ${deleteConfirm?.time}?`}
        confirmLabel="Sim, excluir"
        onConfirm={async () => { if (deleteConfirm) { await deleteAppointment(deleteConfirm.id); setDeleteConfirm(null); } }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
