import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Eye, Pencil, Trash2, User, Phone, Mail,
  Calendar, FileText, Camera, Pill, X, Clipboard,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { Patient, Prescription, ProcedurePhoto, Medication, Anamnesis } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const statusVariant: Record<string, 'success' | 'neutral' | 'warning'> = {
  active: 'success', inactive: 'neutral', pending: 'warning',
};
const statusLabel: Record<string, string> = {
  active: 'Ativo', inactive: 'Inativo', pending: 'Pendente',
};

type PatientForm = {
  name: string; email: string; phone: string; birthDate: string;
  cpf: string; sex: string; address: string; observations: string;
  status: 'active' | 'inactive' | 'pending';
};

const emptyForm = (): PatientForm => ({
  name: '', email: '', phone: '', birthDate: '', cpf: '',
  sex: '', address: '', observations: '', status: 'active',
});

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
} as const;

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = 'rgba(20,184,166,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.07)'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-none transition-all"
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = 'rgba(20,184,166,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.07)'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none transition-all"
      style={inputStyle}
    >
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0d0e14' }}>{o.label}</option>)}
    </select>
  );
}

// ─── Patient form modal ───────────────────────────────────────────────────────
function PatientFormModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: Patient;
}) {
  const { addPatient, updatePatient } = useApp();
  const [form, setForm] = useState<PatientForm>(initial ? {
    name: initial.name, email: initial.email, phone: initial.phone,
    birthDate: initial.birthDate, cpf: initial.cpf, sex: initial.sex,
    address: initial.address, observations: initial.observations, status: initial.status,
  } : emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? {
      name: initial.name, email: initial.email, phone: initial.phone,
      birthDate: initial.birthDate, cpf: initial.cpf, sex: initial.sex,
      address: initial.address, observations: initial.observations, status: initial.status,
    } : emptyForm());
    if (!open) setSaving(false);
  }, [initial, open]);

  const set = (key: keyof PatientForm) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const success = initial
        ? await updatePatient(initial.id, form)
        : await addPatient(form);
      if (success) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={initial ? 'Editar Paciente' : 'Novo Paciente'}
      subtitle={initial ? `Editando ${initial.name}` : 'Preencha os dados do paciente'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
            {initial ? 'Salvar Alterações' : 'Criar Paciente'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome completo *"><Input value={form.name} onChange={set('name')} placeholder="Nome da paciente" /></Field>
        <Field label="Telefone"><Input value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" /></Field>
        <Field label="E-mail"><Input value={form.email} onChange={set('email')} placeholder="email@exemplo.com" type="email" /></Field>
        <Field label="CPF"><Input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" /></Field>
        <Field label="Data de nascimento"><Input value={form.birthDate} onChange={set('birthDate')} type="date" /></Field>
        <Field label="Sexo">
          <SelectField value={form.sex} onChange={set('sex')} options={[
            { value: '', label: 'Selecionar' }, { value: 'F', label: 'Feminino' },
            { value: 'M', label: 'Masculino' }, { value: 'O', label: 'Outro' },
          ]} />
        </Field>
        <Field label="Status">
          <SelectField value={form.status} onChange={v => setForm(f => ({ ...f, status: v as PatientForm['status'] }))} options={[
            { value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }, { value: 'pending', label: 'Pendente' },
          ]} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Endereço"><Input value={form.address} onChange={set('address')} placeholder="Rua, número, cidade" /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Observações"><Textarea value={form.observations} onChange={set('observations')} placeholder="Alergias, histórico clínico..." /></Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Prescription modal ───────────────────────────────────────────────────────
function PrescriptionModal({ open, onClose, patientId, prescriptions }: {
  open: boolean; onClose: () => void; patientId: string; prescriptions: Prescription[];
}) {
  const { addPrescription, deletePrescription } = useApp();
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [instructions, setInstructions] = useState('');
  const [meds, setMeds] = useState<Medication[]>([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [saving, setSaving] = useState(false);

  const mine = prescriptions.filter(p => p.patientId === patientId);

  function addMed() { setMeds(m => [...m, { name: '', dosage: '', frequency: '', duration: '' }]); }
  function removeMed(i: number) { setMeds(m => m.filter((_, idx) => idx !== i)); }
  function updateMed(i: number, k: keyof Medication, v: string) {
    setMeds(m => m.map((med, idx) => idx === i ? { ...med, [k]: v } : med));
  }

  async function handleSave() {
    setSaving(true);
    await addPrescription({ patientId, date, medications: meds, instructions });
    setSaving(false);
    setMode('list');
    setMeds([{ name: '', dosage: '', frequency: '', duration: '' }]);
    setInstructions('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Receitas Médicas" subtitle={`${mine.length} receitas`} maxWidth="max-w-xl">
      {mode === 'list' ? (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setMode('new')}>Nova Receita</Button>
          </div>
          {mine.length === 0 ? (
            <div className="text-center py-10"><Pill size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma receita</p></div>
          ) : mine.map(presc => (
            <div key={presc.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-zinc-300">{formatDate(presc.date)}</span>
                <button onClick={() => deletePrescription(presc.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
              {presc.medications.map((m, i) => (
                <p key={i} className="text-[12px] text-zinc-400"><span className="text-teal-400 font-semibold">{m.name}</span> — {m.dosage} · {m.frequency} · {m.duration}</p>
              ))}
              {presc.instructions && <p className="text-[11px] text-zinc-600 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>{presc.instructions}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setMode('list')} className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">← Voltar</button>
          <Field label="Data"><Input value={date} onChange={setDate} type="date" /></Field>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Medicamentos</label>
              <button onClick={addMed} className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold">+ Adicionar</button>
            </div>
            {meds.map((med, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 p-3 mb-2 rounded-xl relative" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {meds.length > 1 && <button onClick={() => removeMed(i)} className="absolute top-2 right-2 text-zinc-700 hover:text-red-400"><X size={12} /></button>}
                <Field label="Medicamento"><Input value={med.name} onChange={v => updateMed(i, 'name', v)} placeholder="Nome" /></Field>
                <Field label="Dosagem"><Input value={med.dosage} onChange={v => updateMed(i, 'dosage', v)} placeholder="Ex: 500mg" /></Field>
                <Field label="Frequência"><Input value={med.frequency} onChange={v => updateMed(i, 'frequency', v)} placeholder="2x ao dia" /></Field>
                <Field label="Duração"><Input value={med.duration} onChange={v => updateMed(i, 'duration', v)} placeholder="7 dias" /></Field>
              </div>
            ))}
          </div>
          <Field label="Instruções"><Textarea value={instructions} onChange={setInstructions} placeholder="Cuidados, instruções de uso..." /></Field>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('list')}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Salvar Receita</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Photos modal ─────────────────────────────────────────────────────────────
function PhotosModal({ open, onClose, patientId, photos }: {
  open: boolean; onClose: () => void; patientId: string; photos: ProcedurePhoto[];
}) {
  const { addProcedurePhoto, deleteProcedurePhoto } = useApp();
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [procedureName, setProcedureName] = useState('');
  const [observations, setObservations] = useState('');
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const mine = photos.filter(p => p.patientId === patientId);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const b64 = ev.target?.result as string;
        if (target === 'before') setPhotosBefore(prev => [...prev, b64]);
        else setPhotosAfter(prev => [...prev, b64]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSave() {
    if (!procedureName.trim()) return;
    setSaving(true);
    await addProcedurePhoto({ patientId, procedureName, photosBefore, photosAfter, videoUrl: '', observations });
    setSaving(false);
    setMode('list');
    setProcedureName(''); setObservations('');
    setPhotosBefore([]); setPhotosAfter([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Fotos de Procedimento" subtitle={`${mine.length} registros`} maxWidth="max-w-xl">
      {mode === 'list' ? (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" icon={<Camera size={13} />} onClick={() => setMode('new')}>Novo Registro</Button>
          </div>
          {mine.length === 0 ? (
            <div className="text-center py-10"><Camera size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhum registro fotográfico</p></div>
          ) : mine.map(photo => (
            <div key={photo.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-zinc-200">{photo.procedureName}</span>
                <button onClick={() => deleteProcedurePhoto(photo.id)} className="text-zinc-700 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[...photo.photosBefore, ...photo.photosAfter].slice(0, 6).map((src, i) => (
                  <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setMode('list')} className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">← Voltar</button>
          <Field label="Procedimento *"><Input value={procedureName} onChange={setProcedureName} placeholder="Ex: Botox, Preenchimento..." /></Field>
          <div className="grid grid-cols-2 gap-4">
            {(['before', 'after'] as const).map(target => (
              <div key={target}>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{target === 'before' ? 'Fotos Antes' : 'Fotos Depois'}</label>
                <label className="flex flex-col items-center justify-center w-full h-20 rounded-xl cursor-pointer hover:opacity-80 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                  <Camera size={18} className="text-zinc-600 mb-1" />
                  <span className="text-[11px] text-zinc-600">Selecionar</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e, target)} />
                </label>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(target === 'before' ? photosBefore : photosAfter).map((src, i) => (
                    <img key={i} src={src} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Field label="Observações"><Textarea value={observations} onChange={setObservations} placeholder="Notas sobre o procedimento..." /></Field>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setMode('list')}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!procedureName.trim()}>Salvar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Anamnesis modal ──────────────────────────────────────────────────────────
function AnamnesisModal({ open, onClose, patientId, anamneses }: {
  open: boolean; onClose: () => void; patientId: string; anamneses: Anamnesis[];
}) {
  const { addAnamnesis, updateAnamnesis, deleteAnamnesis } = useApp();
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [current, setCurrent] = useState<Anamnesis | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mainComplaint, setMainComplaint] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [previousSurgeries, setPreviousSurgeries] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  const mine = anamneses.filter(a => a.patientId === patientId);

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]);
    setMainComplaint(''); setMedicalHistory(''); setAllergies(''); setCurrentMeds('');
    setFamilyHistory(''); setSocialHistory(''); setPreviousSurgeries('');
    setBloodPressure(''); setHeartRate(''); setTemperature(''); setWeight('');
    setObservations('');
    setCurrent(null);
  }

  function editRecord(a: Anamnesis) {
    setCurrent(a);
    setDate(a.date);
    setMainComplaint(a.mainComplaint);
    setMedicalHistory(a.medicalHistory);
    setAllergies(a.allergies);
    setCurrentMeds(a.currentMedications);
    setFamilyHistory(a.familyHistory);
    setSocialHistory(a.socialHistory);
    setPreviousSurgeries(a.previousSurgeries);
    setBloodPressure(a.vitalSigns.bloodPressure || '');
    setHeartRate(a.vitalSigns.heartRate || '');
    setTemperature(a.vitalSigns.temperature || '');
    setWeight(a.vitalSigns.weight || '');
    setObservations(a.observations);
    setMode('edit');
  }

  async function handleSave() {
    setSaving(true);
    const data: Omit<Anamnesis, 'id' | 'createdAt'> = {
      patientId, date, mainComplaint, medicalHistory, allergies,
      currentMedications: currentMeds, familyHistory, socialHistory, previousSurgeries,
      vitalSigns: { bloodPressure, heartRate, temperature, weight },
      observations,
    };
    if (current) await updateAnamnesis(current.id, data);
    else await addAnamnesis(data);
    setSaving(false);
    setMode('list');
    resetForm();
  }

  return (
    <Modal open={open} onClose={onClose} title="Anamnese Clínica" subtitle={`${mine.length} registros`} maxWidth="max-w-2xl">
      {mode === 'list' ? (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" icon={<Plus size={13} />} onClick={() => { resetForm(); setMode('new'); }}>Nova Anamnese</Button>
          </div>
          {mine.length === 0 ? (
            <div className="text-center py-10"><Clipboard size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma anamnese registrada</p></div>
          ) : mine.map(a => (
            <div key={a.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[12px] font-semibold text-zinc-300">{formatDate(a.date)}</p>
                  <p className="text-[12px] text-zinc-500 mt-0.5">{a.mainComplaint}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editRecord(a)} className="text-zinc-600 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => deleteAnamnesis(a.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                {a.vitalSigns.bloodPressure && <p>PA: {a.vitalSigns.bloodPressure}</p>}
                {a.vitalSigns.weight && <p>Peso: {a.vitalSigns.weight}</p>}
                {a.allergies && <p className="col-span-2">Alergias: {a.allergies}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <button onClick={() => { setMode('list'); resetForm(); }} className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">← Voltar</button>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data"><Input value={date} onChange={setDate} type="date" /></Field>
            <Field label="Queixa Principal"><Input value={mainComplaint} onChange={setMainComplaint} placeholder="Motivo da consulta" /></Field>
          </div>

          <Field label="Histórico Médico"><Textarea value={medicalHistory} onChange={setMedicalHistory} placeholder="Doenças anteriores, condições crônicas..." rows={2} /></Field>
          <Field label="Alergias"><Input value={allergies} onChange={setAllergies} placeholder="Medicamentosa, ambiental..." /></Field>
          <Field label="Medicamentos Atuais"><Textarea value={currentMeds} onChange={setCurrentMeds} placeholder="Medicações em uso" rows={2} /></Field>
          <Field label="Histórico Familiar"><Textarea value={familyHistory} onChange={setFamilyHistory} placeholder="Doenças na família" rows={2} /></Field>
          <Field label="Histórico Social"><Textarea value={socialHistory} onChange={setSocialHistory} placeholder="Hábitos, profissão, estilo de vida..." rows={2} /></Field>
          <Field label="Cirurgias Anteriores"><Textarea value={previousSurgeries} onChange={setPreviousSurgeries} placeholder="Procedimentos cirúrgicos" rows={2} /></Field>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="col-span-2"><p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sinais Vitais</p></div>
            <Field label="PA (mmHg)"><Input value={bloodPressure} onChange={setBloodPressure} placeholder="120/80" /></Field>
            <Field label="FC (bpm)"><Input value={heartRate} onChange={setHeartRate} placeholder="70" /></Field>
            <Field label="Temp (°C)"><Input value={temperature} onChange={setTemperature} placeholder="36.5" /></Field>
            <Field label="Peso (kg)"><Input value={weight} onChange={setWeight} placeholder="70" /></Field>
          </div>

          <Field label="Observações"><Textarea value={observations} onChange={setObservations} placeholder="Notas gerais..." rows={2} /></Field>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => { setMode('list'); resetForm(); }}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>{current ? 'Atualizar' : 'Salvar'} Anamnese</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Patient detail modal ─────────────────────────────────────────────────────
function PatientDetailModal({ open, onClose, patient, onEdit }: {
  open: boolean; onClose: () => void; patient: Patient; onEdit: () => void;
}) {
  const { appointments, prescriptions, procedurePhotos, anamneses } = useApp();
  const [tab, setTab] = useState<'info' | 'anamnesis' | 'appointments' | 'prescriptions' | 'photos'>('info');
  const [prescOpen, setPrescOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [anamOpen, setAnamOpen] = useState(false);

  const patientAppts = appointments.filter(a => a.patientId === patient.id);

  const tabs = [
    { id: 'info', label: 'Dados', icon: <User size={12} /> },
    { id: 'anamnesis', label: `Anamnese (${anamneses.filter(a => a.patientId === patient.id).length})`, icon: <Clipboard size={12} /> },
    { id: 'appointments', label: `Consultas (${patientAppts.length})`, icon: <Calendar size={12} /> },
    { id: 'prescriptions', label: `Receitas (${prescriptions.filter(p => p.patientId === patient.id).length})`, icon: <Pill size={12} /> },
    { id: 'photos', label: `Fotos (${procedurePhotos.filter(p => p.patientId === patient.id).length})`, icon: <Camera size={12} /> },
  ];

  return (
    <>
      <Modal open={open} onClose={onClose} title={patient.name} subtitle="Prontuário do Paciente" maxWidth="max-w-2xl">
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={tab === t.id ? {
                background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.08))',
                border: '1px solid rgba(20,184,166,0.25)', color: '#5eead4',
              } : { color: '#52525b' }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <Avatar name={patient.name} size="lg" />
              <div>
                <p className="text-[18px] font-bold text-zinc-100 tracking-tight">{patient.name}</p>
                <Badge variant={statusVariant[patient.status]}>{statusLabel[patient.status]}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Phone size={12} />, label: 'Telefone', value: patient.phone || '—' },
                { icon: <Mail size={12} />, label: 'E-mail', value: patient.email || '—' },
                { icon: <Calendar size={12} />, label: 'Nascimento', value: formatDate(patient.birthDate) },
                { icon: <FileText size={12} />, label: 'CPF', value: patient.cpf || '—' },
                { icon: <User size={12} />, label: 'Sexo', value: patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : patient.sex || '—' },
                { icon: <FileText size={12} />, label: 'Total gasto', value: formatCurrency(patient.totalSpent) },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-teal-500 mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="text-[12px] text-zinc-300 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {patient.observations && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider mb-1">Observações</p>
                <p className="text-[12px] text-zinc-400 leading-relaxed">{patient.observations}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1 flex-wrap">
              <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>Editar</Button>
              <Button size="sm" variant="secondary" icon={<Clipboard size={12} />} onClick={() => setAnamOpen(true)}>Anamnese</Button>
              <Button size="sm" variant="secondary" icon={<Pill size={12} />} onClick={() => setPrescOpen(true)}>Receitas</Button>
              <Button size="sm" variant="secondary" icon={<Camera size={12} />} onClick={() => setPhotosOpen(true)}>Fotos</Button>
            </div>
          </div>
        )}

        {tab === 'anamnesis' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={12} />} onClick={() => setAnamOpen(true)}>Nova Anamnese</Button>
            </div>
            {anamneses.filter(a => a.patientId === patient.id).length === 0 ? (
              <div className="text-center py-10"><Clipboard size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma anamnese</p></div>
            ) : anamneses.filter(a => a.patientId === patient.id).map(a => (
              <div key={a.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[12px] font-bold text-zinc-300">{formatDate(a.date)}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{a.mainComplaint}</p>
                  </div>
                </div>
                {a.vitalSigns && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-600 mt-2">
                    {a.vitalSigns.bloodPressure && <span>PA: {a.vitalSigns.bloodPressure}</span>}
                    {a.vitalSigns.heartRate && <span>FC: {a.vitalSigns.heartRate}</span>}
                    {a.vitalSigns.temperature && <span>Temp: {a.vitalSigns.temperature}°C</span>}
                    {a.vitalSigns.weight && <span>Peso: {a.vitalSigns.weight}kg</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-2">
            {patientAppts.length === 0 ? (
              <div className="text-center py-10"><Calendar size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma consulta</p></div>
            ) : patientAppts.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-12 text-center flex-shrink-0">
                  <p className="text-[12px] font-bold text-teal-400">{appt.time}</p>
                  <p className="text-[10px] text-zinc-600">{formatDate(appt.date)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-200 truncate">{appt.procedure}</p>
                  <p className="text-[11px] text-zinc-500">{appt.professional}</p>
                </div>
                <Badge variant={appt.status === 'confirmed' ? 'success' : appt.status === 'completed' ? 'teal' : appt.status === 'cancelled' ? 'error' : 'info'}>
                  {appt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {tab === 'prescriptions' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={12} />} onClick={() => setPrescOpen(true)}>Nova Receita</Button>
            </div>
            {prescriptions.filter(p => p.patientId === patient.id).length === 0 ? (
              <div className="text-center py-10"><Pill size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma receita</p></div>
            ) : prescriptions.filter(p => p.patientId === patient.id).map(p => (
              <div key={p.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[11px] font-bold text-zinc-400 mb-2">{formatDate(p.date)}</p>
                {p.medications.map((m, i) => <p key={i} className="text-[12px] text-zinc-500"><span className="text-teal-400">{m.name}</span> — {m.dosage}</p>)}
              </div>
            ))}
          </div>
        )}

        {tab === 'photos' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" icon={<Camera size={12} />} onClick={() => setPhotosOpen(true)}>Novo Registro</Button>
            </div>
            {procedurePhotos.filter(p => p.patientId === patient.id).length === 0 ? (
              <div className="text-center py-10"><Camera size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhum registro</p></div>
            ) : procedurePhotos.filter(p => p.patientId === patient.id).map(photo => (
              <div key={photo.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[13px] font-semibold text-zinc-200 mb-2">{photo.procedureName}</p>
                <div className="flex gap-2 flex-wrap">
                  {[...photo.photosBefore, ...photo.photosAfter].slice(0, 6).map((src, i) => (
                    <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <AnamnesisModal open={anamOpen} onClose={() => setAnamOpen(false)} patientId={patient.id} anamneses={anamneses} />
      <PrescriptionModal open={prescOpen} onClose={() => setPrescOpen(false)} patientId={patient.id} prescriptions={prescriptions} />
      <PhotosModal open={photosOpen} onClose={() => setPhotosOpen(false)} patientId={patient.id} photos={procedurePhotos} />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Pacientes() {
  const { patients, deletePatient, loading } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null);

  const filtered = useMemo(() => patients.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.phone.includes(s);
    return matchSearch && (filter === 'all' || p.status === filter);
  }), [patients, search, filter]);

  const counts = useMemo(() => ({
    all: patients.length,
    active: patients.filter(p => p.status === 'active').length,
    inactive: patients.filter(p => p.status === 'inactive').length,
    pending: patients.filter(p => p.status === 'pending').length,
  }), [patients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Pacientes</h2>
          <p className="text-[13px] text-zinc-500 mt-2">{patients.length} pacientes cadastrados</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Novo Paciente</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl card-premium">
        <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['all', 'active', 'inactive', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={filter === f ? {
                background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.08))',
                border: '1px solid rgba(20,184,166,0.25)', color: '#5eead4',
              } : { color: '#52525b' }}
            >
              {f === 'all' ? 'Todos' : statusLabel[f]} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={13} className="text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="bg-transparent text-[13px] text-zinc-300 placeholder-zinc-600 outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-zinc-600 hover:text-zinc-400" /></button>}
        </div>
      </div>

      <div className="card-premium rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Paciente', 'Contato', 'Última Visita', 'Total Gasto', 'Status', 'Ações'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8">
                  <div className="space-y-3 fade-in">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-6 gap-3 items-center">
                        <Skeleton className="h-10 col-span-2" />
                        <Skeleton className="h-10 col-span-1" />
                        <Skeleton className="h-10 col-span-1" />
                        <Skeleton className="h-10 col-span-1" />
                        <Skeleton className="h-10 col-span-1" />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16">
                  <User size={32} className="text-zinc-700 mb-3" />
                  <p className="text-[13px] text-zinc-500">Nenhum paciente encontrado</p>
                </div>
              </td></tr>
            ) : filtered.map((patient, i) => (
              <tr
                key={patient.id}
                className="transition-colors cursor-pointer"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={patient.name} size="sm" />
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-200 tracking-tight">{patient.name}</p>
                      <p className="text-[11px] text-zinc-600">{patient.procedures.slice(0, 2).join(', ') || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-[12px] text-zinc-400">{patient.phone || '—'}</p>
                  <p className="text-[11px] text-zinc-600">{patient.email || '—'}</p>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-zinc-400">{formatDate(patient.lastVisit)}</td>
                <td className="px-5 py-3.5 text-[13px] font-bold text-zinc-300 tracking-tight">{formatCurrency(patient.totalSpent)}</td>
                <td className="px-5 py-3.5"><Badge variant={statusVariant[patient.status]}>{statusLabel[patient.status]}</Badge></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewPatient(patient)} className="p-1.5 rounded-lg text-zinc-600 hover:text-teal-400 hover:bg-teal-500/10 transition-all"><Eye size={14} /></button>
                    <button onClick={() => setEditPatient(patient)} className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteConfirm(patient)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PatientFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editPatient && <PatientFormModal open={!!editPatient} onClose={() => setEditPatient(null)} initial={editPatient} />}
      {viewPatient && (
        <PatientDetailModal
          open={!!viewPatient}
          onClose={() => setViewPatient(null)}
          patient={viewPatient}
          onEdit={() => { setEditPatient(viewPatient); setViewPatient(null); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir paciente"
        description={`Tem certeza que deseja excluir "${deleteConfirm?.name}"? Todos os dados serão removidos permanentemente.`}
        confirmLabel="Sim, excluir"
        onConfirm={async () => { if (deleteConfirm) { await deletePatient(deleteConfirm.id); setDeleteConfirm(null); } }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
