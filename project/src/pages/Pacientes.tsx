import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Pencil, Trash2, User, Phone, Mail,
  Calendar, FileText, Camera, Pill, X, Clipboard, Video,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useLayout } from '../context/LayoutContext';
import { Patient, Prescription, ProcedurePhoto, Medication, Anamnesis } from '../types';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/layout/BackButton';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import PatientInsightsSummary from '../components/ai/PatientInsightsSummary';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatProcedureDate(d?: string) {
  if (!d) return '—';
  const parsed = new Date(d);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR');
  }
  return formatDate(d);
}

function getDateTimeValue(d?: string) {
  if (!d) return 0;
  const parsed = new Date(d).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openPrintableDocument(title: string, body: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 32px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
    .muted { color: #6b7280; font-size: 12px; }
    .signature { margin-top: 48px; border-top: 1px solid #111827; width: 280px; padding-top: 8px; text-align: center; }
    @media print { button { display: none; } body { margin: 20mm; } }
  </style>
</head>
<body>
  ${body}
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
  printWindow.document.close();
}

const statusVariant: Record<string, 'success' | 'neutral' | 'warning'> = {
  active: 'success', inactive: 'neutral', pending: 'warning',
};
const statusLabel: Record<string, string> = {
  active: 'Ativo', inactive: 'Inativo', pending: 'Pendente',
};

type PatientForm = {
  name: string; email: string; phone: string; whatsapp: string; birthDate: string;
  profilePhoto: string;
  cpf: string; sex: string; address: string; 
  zipCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string;
  emergencyContact: string; emergencyRelation: string; emergencyPhone: string;
  allergies: string; currentMedications: string; medicalHistory: string;
  observations: string;
  status: 'active' | 'inactive' | 'pending';
};

const emptyForm = (): PatientForm => ({
  name: '', email: '', phone: '', whatsapp: '', birthDate: '', cpf: '',
  profilePhoto: '',
  sex: '', address: '', 
  zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  emergencyContact: '', emergencyRelation: '', emergencyPhone: '',
  allergies: '', currentMedications: '', medicalHistory: '',
  observations: '', status: 'active',
});

const toPatientForm = (initial?: Patient): PatientForm => {
  if (!initial) return emptyForm();
  return {
    ...emptyForm(),
    name: initial.name,
    email: initial.email,
    phone: initial.phone,
    whatsapp: initial.whatsapp ?? '',
    profilePhoto: initial.profilePhoto ?? '',
    birthDate: initial.birthDate,
    cpf: initial.cpf,
    sex: initial.sex,
    address: initial.address,
    zipCode: initial.zipCode ?? '',
    street: initial.street ?? '',
    number: initial.number ?? '',
    complement: initial.complement ?? '',
    neighborhood: initial.neighborhood ?? '',
    city: initial.city ?? '',
    state: initial.state ?? '',
    emergencyContact: initial.emergencyContact ?? '',
    emergencyRelation: initial.emergencyRelation ?? '',
    emergencyPhone: initial.emergencyPhone ?? '',
    allergies: initial.allergies ?? '',
    currentMedications: initial.currentMedications ?? '',
    medicalHistory: initial.medicalHistory ?? '',
    observations: initial.observations,
    status: initial.status,
  };
};

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

function Input({ value, onChange, placeholder, type = 'text', maxLength, inputMode, autoComplete, invalid = false }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  invalid?: boolean;
}) {
  const borderColor = invalid ? 'rgba(248,113,113,0.75)' : inputStyle.border;
  const focusBorderColor = invalid ? 'rgba(248,113,113,0.9)' : 'rgba(20,184,166,0.4)';
  const focusShadow = invalid ? '0 0 0 3px rgba(248,113,113,0.12)' : '0 0 0 3px rgba(20,184,166,0.07)';

  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      autoComplete={autoComplete}
      className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
      style={{ ...inputStyle, border: borderColor }}
      onFocus={e => { e.target.style.borderColor = focusBorderColor; e.target.style.boxShadow = focusShadow; }}
      onBlur={e => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none'; }}
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
function applyCpfMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{1,3})?(\d{1,3})?(\d{1,2})?/, (_, p1, p2, p3, p4) => {
    let result = p1;
    if (p2) result += `.${p2}`;
    if (p3) result += `.${p3}`;
    if (p4) result += `-${p4}`;
    return result;
  });
}

function applyPhoneMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{2})(\d{1,5})?(\d{1,4})?/, (_, p1, p2, p3) => {
    let result = `(${p1}`;
    if (p2) result += `) ${p2}`;
    if (p3) result += `-${p3}`;
    return result;
  });
}

function isValidCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function applyZipCodeMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})?/, (_, p1, p2) => {
    return p2 ? `${p1}-${p2}` : p1;
  });
}

function countDigits(value: string) {
  return value.replace(/\D/g, '').length;
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem.'));
    };
    image.src = url;
  });
}

async function compressImageFile(file: File, options: { maxSide?: number; quality?: number } = {}): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return fileToDataUrl(file);
  }

  const image = await loadImageFromFile(file);
  const maxSide = options.maxSide ?? 1600;
  const quality = options.quality ?? 0.82;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return fileToDataUrl(file);
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function compressProfilePhotoFile(file: File): Promise<string> {
  return compressImageFile(file, { maxSide: 512, quality: 0.76 });
}

function getSupportedVideoMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return types.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) ?? '';
}

async function compressVideoFile(file: File): Promise<string> {
  if (
    typeof document === 'undefined' ||
    typeof MediaRecorder === 'undefined' ||
    !file.type.startsWith('video/')
  ) {
    return fileToDataUrl(file);
  }

  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) {
    return fileToDataUrl(file);
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const chunks: Blob[] = [];
    let animationId = 0;
    let timeoutId = 0;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (animationId) cancelAnimationFrame(animationId);
      if (timeoutId) window.clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const fallback = async () => {
      cleanup();
      resolve(await fileToDataUrl(file));
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

        const context = canvas.getContext('2d');
        const canvasStream = canvas.captureStream(24);
        const captureSource = video as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        };
        const sourceStream = captureSource.captureStream?.() ?? captureSource.mozCaptureStream?.();
        sourceStream?.getAudioTracks().forEach(track => canvasStream.addTrack(track));

        const recorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: 1_800_000,
          audioBitsPerSecond: 96_000,
        });

        const drawFrame = () => {
          if (video.paused || video.ended) return;
          context?.drawImage(video, 0, 0, canvas.width, canvas.height);
          animationId = requestAnimationFrame(drawFrame);
        };

        recorder.ondataavailable = event => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = async () => {
          cleanup();
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' });
          resolve(blob.size > 0 && blob.size < file.size ? await fileToDataUrl(blob) : await fileToDataUrl(file));
        };
        recorder.onerror = () => {
          void fallback();
        };

        video.onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };

        timeoutId = window.setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, Math.min(Math.max(video.duration * 1000 + 1500, 5000), 45000));

        await video.play();
        drawFrame();
        recorder.start(1000);
      } catch {
        void fallback();
      }
    };

    video.onerror = () => {
      void fallback();
    };
  });
}

function PatientFormModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: Patient;
}) {
  const { addPatient, updatePatient, showToast } = useApp();
  const [form, setForm] = useState<PatientForm>(toPatientForm(initial));
  const [saving, setSaving] = useState(false);
  const [profilePhotoProcessing, setProfilePhotoProcessing] = useState(false);
  const [zipCodeLookupStatus, setZipCodeLookupStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const cpfInvalid = Boolean(form.cpf) && !isValidCpf(form.cpf);
  const emailInvalid = Boolean(form.email) && !isValidEmail(form.email);

  useEffect(() => {
    setForm(toPatientForm(initial));
    if (!open) {
      setSaving(false);
      setProfilePhotoProcessing(false);
      setZipCodeLookupStatus('idle');
    }
  }, [initial, open]);

  const set = (key: keyof PatientForm) => (v: string) => {
    let formattedValue = v;
    if (key === 'cpf') formattedValue = applyCpfMask(v);
    if (key === 'phone' || key === 'whatsapp') formattedValue = applyPhoneMask(v);
    if (key === 'zipCode') formattedValue = applyZipCodeMask(v);
    if (key === 'birthDate' && v.length > 10) formattedValue = v.slice(0, 10);
    setForm(f => ({ ...f, [key]: formattedValue }));
  };

  useEffect(() => {
    if (!open) return;

    const zipCode = form.zipCode.replace(/\D/g, '');
    if (zipCode.length < 8) {
      setZipCodeLookupStatus('idle');
      return;
    }

    const controller = new AbortController();
    setZipCodeLookupStatus('loading');

    fetch(`https://viacep.com.br/ws/${zipCode}/json/`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('CEP não encontrado.');
        return response.json() as Promise<{
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        }>;
      })
      .then(data => {
        if (data.erro) throw new Error('CEP não encontrado.');
        setForm(current => {
          if (current.zipCode.replace(/\D/g, '') !== zipCode) return current;
          return {
            ...current,
            street: data.logradouro ?? current.street,
            neighborhood: data.bairro ?? current.neighborhood,
            city: data.localidade ?? current.city,
            state: data.uf ?? current.state,
          };
        });
        setZipCodeLookupStatus('idle');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setZipCodeLookupStatus('error');
        showToast?.('Não foi possível localizar esse CEP.', 'error');
      });

    return () => controller.abort();
  }, [form.zipCode, open, showToast]);

  async function handleProfilePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setProfilePhotoProcessing(true);

    try {
      const dataUrl = await compressProfilePhotoFile(file);
      setForm(f => ({ ...f, profilePhoto: dataUrl }));
    } catch {
      showToast?.('Não foi possível processar a foto de perfil. Tente outra imagem.', 'error');
    } finally {
      setProfilePhotoProcessing(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    if (cpfInvalid) {
      showToast?.('CPF inválido. Verifique os números digitados.', 'error');
      return;
    }

    if (form.phone && countDigits(form.phone) !== 11) {
      showToast?.('Telefone deve ter exatamente 11 números.', 'error');
      return;
    }

    if (form.whatsapp && countDigits(form.whatsapp) !== 11) {
      showToast?.('WhatsApp deve ter exatamente 11 números.', 'error');
      return;
    }

    if (form.zipCode && countDigits(form.zipCode) !== 8) {
      showToast?.('CEP deve ter exatamente 8 números.', 'error');
      return;
    }

    if (emailInvalid) {
      showToast?.('E-mail inválido.', 'error');
      return;
    }

    setSaving(true);
    try {
      const success = initial
        ? await updatePatient(initial.id, form)
        : await addPatient(form);
      if (success) onClose();
      if (!success) {
        showToast?.('Não foi possível salvar o paciente. Tente novamente.', 'error');
      }
    } catch {
      showToast?.('Erro ao salvar paciente. Verifique a conexão e tente novamente.', 'error');
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
          <Button size="sm" onClick={handleSave} loading={saving || profilePhotoProcessing} disabled={!form.name.trim() || profilePhotoProcessing}>
            {initial ? 'Salvar Alterações' : 'Criar Paciente'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={form.name || 'Paciente'} src={form.profilePhoto} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-zinc-200">{form.name || 'Foto de perfil'}</p>
              <p className="text-[11px] text-zinc-600">Imagem exibida no balão ao lado do nome</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {form.profilePhoto && (
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, profilePhoto: '' }))}
                className="h-8 rounded-xl px-3 text-[12px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
              >
                Remover
              </button>
            )}
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-[12px] font-semibold text-zinc-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]">
              <Upload size={13} />
              Câmera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleProfilePhotoUpload} />
            </label>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-[12px] font-semibold text-zinc-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08]">
              <Upload size={13} />
              Galeria
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
            </label>
          </div>
          {profilePhotoProcessing && <p className="text-[11px] text-zinc-500 sm:text-right">Compactando foto...</p>}
        </div>
        
        {/* Dados Pessoais */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo *"><Input value={form.name} onChange={set('name')} placeholder="Nome da paciente" /></Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" invalid={cpfInvalid} />
              {cpfInvalid && <p className="mt-1 text-[11px] text-red-400">CPF inválido.</p>}
            </Field>
            <Field label="Data de nascimento">
              <input
                type="date"
                value={form.birthDate}
                onChange={e => set('birthDate')(e.target.value)}
                max="9999-12-31"
                className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(20,184,166,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.07)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
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
          </div>
        </div>

        {/* Contato */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefone">
              <Input value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" maxLength={15} inputMode="numeric" autoComplete="tel" />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp} onChange={set('whatsapp')} placeholder="(11) 99999-9999" maxLength={15} inputMode="numeric" autoComplete="tel" />
            </Field>
            <Field label="E-mail">
              <Input value={form.email} onChange={set('email')} placeholder="email@exemplo.com" type="email" autoComplete="email" invalid={emailInvalid} />
              {emailInvalid && <p className="mt-1 text-[11px] text-red-400">E-mail inválido.</p>}
            </Field>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Endereço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CEP">
              <Input value={form.zipCode} onChange={set('zipCode')} placeholder="00000-000" maxLength={9} inputMode="numeric" autoComplete="postal-code" />
              {zipCodeLookupStatus === 'loading' && <p className="mt-1 text-[11px] text-zinc-500">Buscando endereço...</p>}
              {zipCodeLookupStatus === 'error' && <p className="mt-1 text-[11px] text-red-400">CEP não localizado.</p>}
            </Field>
            <Field label="Rua"><Input value={form.street} onChange={set('street')} placeholder="Nome da rua" autoComplete="address-line1" /></Field>
            <Field label="Número"><Input value={form.number} onChange={set('number')} placeholder="123" /></Field>
            <Field label="Complemento"><Input value={form.complement} onChange={set('complement')} placeholder="Apto, Sala..." /></Field>
            <Field label="Bairro"><Input value={form.neighborhood} onChange={set('neighborhood')} placeholder="Bairro" /></Field>
            <Field label="Cidade"><Input value={form.city} onChange={set('city')} placeholder="Cidade" /></Field>
            <Field label="Estado"><Input value={form.state} onChange={set('state')} placeholder="UF" /></Field>
          </div>
        </div>

        {/* Emergência */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Emergência</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome do Contato"><Input value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="Nome" /></Field>
            <Field label="Parentesco"><Input value={form.emergencyRelation} onChange={set('emergencyRelation')} placeholder="Mãe, Cônjuge..." /></Field>
            <Field label="Telefone de Emergência">
              <Input value={form.emergencyPhone} onChange={v => setForm(f => ({ ...f, emergencyPhone: applyPhoneMask(v) }))} placeholder="(11) 99999-9999" maxLength={15} inputMode="numeric" autoComplete="tel" />
            </Field>
          </div>
        </div>

        {/* Informações Médicas */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Informações Médicas</h3>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Alergias"><Textarea value={form.allergies} onChange={set('allergies')} placeholder="Ex: Penicilina, poeira..." rows={2} /></Field>
            <Field label="Medicamentos"><Textarea value={form.currentMedications} onChange={set('currentMedications')} placeholder="Medicamentos em uso..." rows={2} /></Field>
            <Field label="Doenças"><Textarea value={form.medicalHistory} onChange={set('medicalHistory')} placeholder="Histórico de doenças..." rows={2} /></Field>
          </div>
        </div>

        {/* Observações */}
        <div>
          <h3 className="text-[13px] font-bold text-teal-400 mb-3 border-b border-white/5 pb-2">Observações</h3>
          <Field label="Campo livre"><Textarea value={form.observations} onChange={set('observations')} placeholder="Qualquer outra informação relevante..." rows={3} /></Field>
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
  const medicineSuggestions = [
    { name: 'Paracetamol', dosage: '500mg ou 750mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Dipirona', dosage: '500mg ou 1g', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Ibuprofeno', dosage: '400mg ou 600mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Cetoprofeno', dosage: '50mg ou 100mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Amoxicilina', dosage: '500mg ou 875mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Azitromicina', dosage: '500mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Cefalexina', dosage: '500mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Prednisona', dosage: '5mg ou 20mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Loratadina', dosage: '10mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Hidroxizina', dosage: '25mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Omeprazol', dosage: '20mg', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
    { name: 'Clorexidina', dosage: '0,12%', frequency: 'Conforme prescrição', duration: 'Conforme avaliação' },
  ];

  function addMed() { setMeds(m => [...m, { name: '', dosage: '', frequency: '', duration: '' }]); }
  function removeMed(i: number) { setMeds(m => m.filter((_, idx) => idx !== i)); }
  function updateMed(i: number, k: keyof Medication, v: string) {
    setMeds(m => m.map((med, idx) => idx === i ? { ...med, [k]: v } : med));
  }

  function applyMedicineSuggestion(i: number, value: string) {
    const suggestion = medicineSuggestions.find((item) => item.name === value);
    if (!suggestion) return;
    setMeds(m => m.map((med, idx) => idx === i ? { ...med, ...suggestion } : med));
  }

  function buildPrescriptionHtml(prescription: Prescription) {
    return `
      <h1>Receita médica</h1>
      <p class="muted">Data: ${escapeHtml(formatDate(prescription.date))}</p>
      <h2>Medicamentos</h2>
      <table>
        <thead><tr><th>Medicamento</th><th>Dosagem</th><th>Frequência</th><th>Duração</th></tr></thead>
        <tbody>
          ${prescription.medications.map((medication) => `
            <tr>
              <td>${escapeHtml(medication.name || '—')}</td>
              <td>${escapeHtml(medication.dosage || '—')}</td>
              <td>${escapeHtml(medication.frequency || '—')}</td>
              <td>${escapeHtml(medication.duration || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <h2>Instruções</h2>
      <p>${escapeHtml(prescription.instructions || '—')}</p>
      <p class="muted">Consulte registro e bula oficial na Anvisa quando necessário.</p>
      <div class="signature">Assinatura e carimbo</div>
    `;
  }

  function printPrescription(prescription: Prescription) {
    openPrintableDocument('Receita médica', buildPrescriptionHtml(prescription));
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
                <div className="flex gap-1">
                  <button onClick={() => printPrescription(presc)} className="text-zinc-600 hover:text-teal-400 transition-colors" title="Imprimir / salvar em PDF"><FileText size={13} /></button>
                  <button onClick={() => deletePrescription(presc.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
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
          <BackButton onClick={() => setMode('list')} />
          <Field label="Data"><Input value={date} onChange={setDate} type="date" /></Field>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Medicamentos</label>
              <button onClick={addMed} className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold">+ Adicionar</button>
            </div>
            {meds.map((med, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 p-3 mb-2 rounded-xl relative" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {meds.length > 1 && <button onClick={() => removeMed(i)} className="absolute top-2 right-2 text-zinc-700 hover:text-red-400"><X size={12} /></button>}
                <Field label="Medicamento">
                  <SelectField value={medicineSuggestions.some(item => item.name === med.name) ? med.name : ''} onChange={v => applyMedicineSuggestion(i, v)} options={[
                    { value: '', label: 'Selecionar sugestão' },
                    ...medicineSuggestions.map(item => ({ value: item.name, label: item.name })),
                  ]} />
                </Field>
                <Field label="Nome livre"><Input value={med.name} onChange={v => updateMed(i, 'name', v)} placeholder="Nome do medicamento" /></Field>
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
  const photoLimit = 12;
  const videoLimit = 4;
  const { addProcedurePhoto, updateProcedurePhoto, deleteProcedurePhoto, showToast } = useApp();
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [current, setCurrent] = useState<ProcedurePhoto | null>(null);
  const [procedureName, setProcedureName] = useState('');
  const [observations, setObservations] = useState('');
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [videosBefore, setVideosBefore] = useState<string[]>([]);
  const [videosAfter, setVideosAfter] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [mediaProcessing, setMediaProcessing] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{
    type: 'photo' | 'video';
    src: string;
    title: string;
    subtitle: string;
  } | null>(null);

  const mine = photos
    .filter(p => p.patientId === patientId)
    .sort((left, right) => getDateTimeValue(right.createdAt) - getDateTimeValue(left.createdAt));

  const hasProcedureMedia = mine.some(photo =>
    photo.photosBefore.length > 0 ||
    photo.photosAfter.length > 0 ||
    (photo.videosBefore?.length ?? 0) > 0 ||
    (photo.videosAfter?.length ?? 0) > 0 ||
    Boolean(photo.videoUrl)
  );

  function resetForm() {
    setCurrent(null);
    setProcedureName('');
    setObservations('');
    setPhotosBefore([]);
    setPhotosAfter([]);
    setVideosBefore([]);
    setVideosAfter([]);
  }

  function startNew() {
    resetForm();
    setMode('form');
  }

  function startEdit(photo: ProcedurePhoto) {
    setCurrent(photo);
    setProcedureName(photo.procedureName);
    setObservations(photo.observations);
    setPhotosBefore(photo.photosBefore.slice(0, photoLimit));
    setPhotosAfter(photo.photosAfter.slice(0, photoLimit));
    setVideosBefore((photo.videosBefore ?? []).slice(0, videoLimit));
    setVideosAfter((photo.videosAfter ?? (photo.videoUrl ? [photo.videoUrl] : [])).slice(0, videoLimit));
    setMode('form');
  }

  function addProcessedMedia(target: 'before' | 'after', media: 'photo' | 'video', dataUrl: string) {
    if (media === 'photo') {
      if (target === 'before') setPhotosBefore(prev => [...prev, dataUrl].slice(0, photoLimit));
      else setPhotosAfter(prev => [...prev, dataUrl].slice(0, photoLimit));
      return;
    }

    if (target === 'before') setVideosBefore(prev => [...prev, dataUrl].slice(0, videoLimit));
    else setVideosAfter(prev => [...prev, dataUrl].slice(0, videoLimit));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after', media: 'photo' | 'video') {
    const limit = media === 'photo' ? photoLimit : videoLimit;
    const currentList =
      media === 'photo'
        ? target === 'before' ? photosBefore : photosAfter
        : target === 'before' ? videosBefore : videosAfter;
    const availableSlots = Math.max(limit - currentList.length, 0);
    const files = Array.from(e.target.files ?? []).slice(0, availableSlots);

    e.target.value = '';
    if (files.length === 0) return;

    setMediaProcessing(true);
    try {
      for (const file of files) {
        const dataUrl = media === 'photo' ? await compressImageFile(file) : await compressVideoFile(file);
        addProcessedMedia(target, media, dataUrl);
      }
    } catch {
      showToast?.('Não foi possível processar uma das mídias. Tente outro arquivo.', 'error');
    } finally {
      setMediaProcessing(false);
    }
  }

  function removeMedia(target: 'before' | 'after', media: 'photo' | 'video', index: number) {
    if (media === 'photo') {
      if (target === 'before') setPhotosBefore(prev => prev.filter((_, i) => i !== index));
      else setPhotosAfter(prev => prev.filter((_, i) => i !== index));
      return;
    }

    if (target === 'before') setVideosBefore(prev => prev.filter((_, i) => i !== index));
    else setVideosAfter(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!procedureName.trim() || mediaProcessing) return;
    setSaving(true);
    const payload = {
      patientId,
      procedureName,
      photosBefore: photosBefore.slice(0, photoLimit),
      photosAfter: photosAfter.slice(0, photoLimit),
      videoUrl: videosAfter[0] ?? videosBefore[0] ?? '',
      videosBefore: videosBefore.slice(0, videoLimit),
      videosAfter: videosAfter.slice(0, videoLimit),
      observations,
    };
    if (current) await updateProcedurePhoto(current.id, payload);
    else await addProcedurePhoto(payload);
    setSaving(false);
    setMode('list');
    resetForm();
  }

  function renderMediaTile(item: { key: string; type: 'photo' | 'video'; src: string; title: string; subtitle: string }) {
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setPreviewMedia(item)}
        className="overflow-hidden rounded-lg bg-black/20 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        title="Abrir preview"
      >
        <div className="aspect-square">
          {item.type === 'photo' ? (
            <img src={item.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={item.src} className="h-full w-full object-cover" muted />
          )}
        </div>
      </button>
    );
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Fotos e Vídeos de Procedimento" subtitle={`${mine.length} registros`} maxWidth="max-w-3xl">
      {mode === 'list' ? (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" icon={<Camera size={13} />} onClick={startNew}>Novo Registro</Button>
          </div>
          {mine.length === 0 ? (
            <div className="text-center py-10"><Camera size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhum registro fotográfico</p></div>
          ) : !hasProcedureMedia ? (
            <div className="text-center py-10"><Camera size={28} className="text-zinc-700 mx-auto mb-3" /><p className="text-[13px] text-zinc-500">Nenhuma foto ou vídeo anexado</p></div>
          ) : (
            <div className="space-y-4">
              {mine.map(photo => {
                const beforeItems = [
                  ...photo.photosBefore.map((src, index) => ({ key: `${photo.id}-photo-before-${index}`, type: 'photo' as const, src, title: photo.procedureName || 'Procedimento', subtitle: `Antes - ${formatProcedureDate(photo.createdAt)}` })),
                  ...(photo.videosBefore ?? []).map((src, index) => ({ key: `${photo.id}-video-before-${index}`, type: 'video' as const, src, title: photo.procedureName || 'Procedimento', subtitle: `Antes - ${formatProcedureDate(photo.createdAt)}` })),
                ];
                const afterItems = [
                  ...photo.photosAfter.map((src, index) => ({ key: `${photo.id}-photo-after-${index}`, type: 'photo' as const, src, title: photo.procedureName || 'Procedimento', subtitle: `Depois - ${formatProcedureDate(photo.createdAt)}` })),
                  ...(photo.videosAfter ?? (photo.videoUrl ? [photo.videoUrl] : [])).map((src, index) => ({ key: `${photo.id}-video-after-${index}`, type: 'video' as const, src, title: photo.procedureName || 'Procedimento', subtitle: `Depois - ${formatProcedureDate(photo.createdAt)}` })),
                ];

                if (beforeItems.length === 0 && afterItems.length === 0) return null;

                return (
                  <div key={photo.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-zinc-200">{photo.procedureName || 'Procedimento'}</p>
                        <p className="text-[11px] text-zinc-500">{formatProcedureDate(photo.createdAt)}</p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1">
                        <button type="button" onClick={() => startEdit(photo)} className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-blue-400" title="Editar registro">
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => deleteProcedurePhoto(photo.id)} className="rounded-lg p-1.5 text-zinc-700 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Excluir registro">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Antes</p>
                          <span className="text-[10px] text-zinc-600">{beforeItems.length} mídia{beforeItems.length === 1 ? '' : 's'}</span>
                        </div>
                        {beforeItems.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">{beforeItems.map(renderMediaTile)}</div>
                        ) : (
                          <div className="flex aspect-[3/1] items-center justify-center rounded-lg bg-white/[0.025] text-[11px] text-zinc-700">Sem mídia</div>
                        )}
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Depois</p>
                          <span className="text-[10px] text-zinc-600">{afterItems.length} mídia{afterItems.length === 1 ? '' : 's'}</span>
                        </div>
                        {afterItems.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">{afterItems.map(renderMediaTile)}</div>
                        ) : (
                          <div className="flex aspect-[3/1] items-center justify-center rounded-lg bg-white/[0.025] text-[11px] text-zinc-700">Sem mídia</div>
                        )}
                      </div>
                    </div>

                    {photo.observations && <p className="mt-3 text-[11px] text-zinc-600">{photo.observations}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <BackButton onClick={() => { setMode('list'); resetForm(); }} />
          <Field label="Procedimento *"><Input value={procedureName} onChange={setProcedureName} placeholder="Ex: Botox, Preenchimento..." /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['before', 'after'] as const).map(target => (
              <div key={target}>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{target === 'before' ? 'Antes' : 'Depois'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                    <Camera size={18} className="text-zinc-600 mb-1" />
                    <span className="text-[11px] text-zinc-600">Fotos ({(target === 'before' ? photosBefore : photosAfter).length}/{photoLimit})</span>
                    <div className="grid w-full grid-cols-2 gap-1">
                      <label className="cursor-pointer rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-300">
                        Câmera
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(e, target, 'photo')} />
                      </label>
                      <label className="cursor-pointer rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-300">
                        Galeria
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e, target, 'photo')} />
                      </label>
                    </div>
                  </div>
                  <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                    <Video size={18} className="text-zinc-600 mb-1" />
                    <span className="text-[11px] text-zinc-600">Vídeos ({(target === 'before' ? videosBefore : videosAfter).length}/{videoLimit})</span>
                    <div className="grid w-full grid-cols-2 gap-1">
                      <label className="cursor-pointer rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-300">
                        Câmera
                        <input type="file" accept="video/*" capture="environment" className="hidden" onChange={e => handleUpload(e, target, 'video')} />
                      </label>
                      <label className="cursor-pointer rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-300">
                        Galeria
                        <input type="file" accept="video/*" multiple className="hidden" onChange={e => handleUpload(e, target, 'video')} />
                      </label>
                    </div>
                  </div>
                </div>
                {mediaProcessing && <p className="mt-2 text-[11px] text-zinc-500">Compactando mídia...</p>}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(target === 'before' ? photosBefore : photosAfter).map((src, i) => (
                    <button key={i} type="button" onClick={() => removeMedia(target, 'photo', i)} title="Remover foto">
                      <img src={src} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    </button>
                  ))}
                  {(target === 'before' ? videosBefore : videosAfter).map((src, i) => (
                    <button key={`v-${i}`} type="button" onClick={() => removeMedia(target, 'video', i)} title="Remover vídeo">
                      <video src={src} className="w-12 h-12 object-cover rounded-lg" muted />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Field label="Observações"><Textarea value={observations} onChange={setObservations} placeholder="Notas sobre o procedimento..." /></Field>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setMode('list')}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving || mediaProcessing} disabled={!procedureName.trim() || mediaProcessing}>Salvar</Button>
          </div>
        </div>
      )}
    </Modal>
    {previewMedia && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewMedia(null)} aria-label="Fechar preview" />
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl layer-surface" style={{ background: 'rgba(12,13,19,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 34px 84px rgba(0,0,0,0.66)' }}>
          <div className="flex items-start justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-zinc-100">{previewMedia.title}</p>
              <p className="text-[11px] text-zinc-500">{previewMedia.subtitle}</p>
            </div>
            <button type="button" onClick={() => setPreviewMedia(null)} className="rounded-xl p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200" aria-label="Fechar preview">
              <X size={16} />
            </button>
          </div>
          <div className="flex max-h-[76vh] items-center justify-center bg-black/25 p-3">
            {previewMedia.type === 'photo' ? (
              <img src={previewMedia.src} alt="" className="max-h-[72vh] max-w-full rounded-lg object-contain" />
            ) : (
              <video src={previewMedia.src} className="max-h-[72vh] max-w-full rounded-lg" controls autoPlay />
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

const aestheticProcedureOptions = [
  { id: 'botox', label: 'Botox' },
  { id: 'fullFace', label: 'Full Face' },
  { id: 'pdoThreads', label: 'Fios de PDO' },
  { id: 'skinCleaning', label: 'Limpeza de pele' },
  { id: 'skinbooster', label: 'Skinbooster' },
  { id: 'biostimulator', label: 'Bioestimulador' },
  { id: 'lipFiller', label: 'Preenchimento labial' },
  { id: 'rhinomodeling', label: 'Rinomodelação' },
  { id: 'microneedling', label: 'Microagulhamento' },
  { id: 'chemicalPeeling', label: 'Peeling químico' },
  { id: 'facialHarmonization', label: 'Harmonização facial' },
];

const facialBooleanFields = [
  { key: 'melasma', label: 'Melasma' },
  { key: 'rosacea', label: 'Rosácea' },
  { key: 'sagging', label: 'Flacidez' },
  { key: 'fineLines', label: 'Linhas finas' },
  { key: 'deepWrinkles', label: 'Rugas profundas' },
  { key: 'facialAsymmetry', label: 'Assimetria facial' },
  { key: 'doubleChin', label: 'Papada' },
  { key: 'facialVolumeLoss', label: 'Perda de volume facial' },
  { key: 'scars', label: 'Cicatrizes' },
  { key: 'enlargedPores', label: 'Poros dilatados' },
] as const;

const emptyFacialAssessment = () => ({
  skinType: '',
  acne: '',
  melasma: false,
  rosacea: false,
  sagging: false,
  fineLines: false,
  deepWrinkles: false,
  facialAsymmetry: false,
  doubleChin: false,
  facialVolumeLoss: false,
  skinQuality: '',
  sensitivity: '',
  scars: false,
  enlargedPores: false,
  oiliness: '',
  agingDegree: '',
});

const emptyProcedureDetails = () => ({
  botox: { region: '', units: '', brand: '', followUp: '' },
  pdoThreads: { threadType: '', quantity: '', region: '', objective: '' },
  fullFace: { strategy: '', treatedAreas: '', productAmount: '' },
  skinCleaning: { acneDegree: '', extractionPerformed: '', productsUsed: '', skinReaction: '' },
});

const mergeProcedureDetails = (details?: Anamnesis['procedureDetails']) => {
  const empty = emptyProcedureDetails();

  return {
    botox: { ...empty.botox, ...(details?.botox ?? {}) },
    pdoThreads: { ...empty.pdoThreads, ...(details?.pdoThreads ?? {}) },
    fullFace: { ...empty.fullFace, ...(details?.fullFace ?? {}) },
    skinCleaning: { ...empty.skinCleaning, ...(details?.skinCleaning ?? {}) },
  };
};

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
  const [observations, setObservations] = useState('');
  const [facialAssessment, setFacialAssessment] = useState(emptyFacialAssessment());
  const [estheticProcedures, setEstheticProcedures] = useState<string[]>([]);
  const [procedureDetails, setProcedureDetails] = useState(emptyProcedureDetails());
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [aestheticPhotosBefore, setAestheticPhotosBefore] = useState<string[]>([]);
  const [aestheticPhotosAfter, setAestheticPhotosAfter] = useState<string[]>([]);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const mine = anamneses.filter(a => a.patientId === patientId);

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]);
    setMainComplaint(''); setMedicalHistory(''); setAllergies(''); setCurrentMeds('');
    setFamilyHistory(''); setSocialHistory(''); setPreviousSurgeries('');
    setObservations('');
    setFacialAssessment(emptyFacialAssessment());
    setEstheticProcedures([]);
    setProcedureDetails(emptyProcedureDetails());
    setClinicalNotes('');
    setAestheticPhotosBefore([]);
    setAestheticPhotosAfter([]);
    setDigitalSignature('');
    setSignatureDate('');
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
    setObservations(a.observations);
    setFacialAssessment({ ...emptyFacialAssessment(), ...(a.facialAssessment ?? {}) });
    setEstheticProcedures(a.estheticProcedures ?? []);
    setProcedureDetails(mergeProcedureDetails(a.procedureDetails));
    setClinicalNotes(a.clinicalNotes ?? '');
    setAestheticPhotosBefore(a.aestheticPhotosBefore ?? []);
    setAestheticPhotosAfter(a.aestheticPhotosAfter ?? []);
    setDigitalSignature(a.digitalSignature ?? '');
    setSignatureDate(a.signatureDate ?? '');
    setMode('edit');
  }

  function updateFacialAssessment(key: keyof ReturnType<typeof emptyFacialAssessment>, value: string | boolean) {
    setFacialAssessment((current) => ({ ...current, [key]: value }));
  }

  function toggleEstheticProcedure(id: string) {
    setEstheticProcedures((current) =>
      current.includes(id) ? current.filter((procedureId) => procedureId !== id) : [...current, id],
    );
  }

  function updateProcedureDetail(
    procedure: keyof ReturnType<typeof emptyProcedureDetails>,
    field: string,
    value: string,
  ) {
    setProcedureDetails((current) => ({
      ...current,
      [procedure]: {
        ...current[procedure],
        [field]: value,
      },
    }));
  }

  async function handleAnamnesisPhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'before' | 'after',
  ) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(8 - (target === 'before' ? aestheticPhotosBefore.length : aestheticPhotosAfter.length), 0));
    e.target.value = '';
    if (files.length === 0) return;

    setPhotoProcessing(true);
    try {
      for (const file of files) {
        const dataUrl = await compressImageFile(file, { maxSide: 1400, quality: 0.8 });
        if (target === 'before') setAestheticPhotosBefore((current) => [...current, dataUrl].slice(0, 8));
        else setAestheticPhotosAfter((current) => [...current, dataUrl].slice(0, 8));
      }
    } catch {
      // O modal de anamnese mantém o fluxo leve; falhas de mídia não bloqueiam os demais dados.
    } finally {
      setPhotoProcessing(false);
    }
  }

  function removeAnamnesisPhoto(target: 'before' | 'after', index: number) {
    if (target === 'before') setAestheticPhotosBefore((current) => current.filter((_, i) => i !== index));
    else setAestheticPhotosAfter((current) => current.filter((_, i) => i !== index));
  }

  function printAnamnesisPdf() {
    const draft: Anamnesis = {
      id: current?.id ?? 'draft',
      patientId,
      date,
      mainComplaint,
      medicalHistory,
      allergies,
      currentMedications: currentMeds,
      familyHistory,
      socialHistory,
      previousSurgeries,
      vitalSigns: {},
      observations,
      facialAssessment,
      estheticProcedures,
      procedureDetails,
      clinicalNotes,
      aestheticPhotosBefore,
      aestheticPhotosAfter,
      digitalSignature,
      signatureDate: signatureDate || new Date().toISOString(),
      createdAt: current?.createdAt,
    };
    openPrintableDocument('Anamnese estética', buildAnamnesisHtml(draft));
  }

  function printSavedAnamnesis(anamnesis: Anamnesis) {
    openPrintableDocument('Anamnese estética', buildAnamnesisHtml(anamnesis));
  }

  function buildAnamnesisHtml(anamnesis: Anamnesis) {
    const selectedProcedures = aestheticProcedureOptions
      .filter(option => anamnesis.estheticProcedures?.includes(option.id))
      .map(option => option.label)
      .join(', ');

    return `
      <h1>Anamnese estética</h1>
      <p class="muted">Data: ${escapeHtml(formatDate(anamnesis.date))}</p>
      <h2>Dados clínicos</h2>
      <p><strong>Queixa principal:</strong> ${escapeHtml(anamnesis.mainComplaint || '—')}</p>
      <p><strong>Histórico médico:</strong> ${escapeHtml(anamnesis.medicalHistory || '—')}</p>
      <p><strong>Alergias:</strong> ${escapeHtml(anamnesis.allergies || '—')}</p>
      <p><strong>Medicamentos atuais:</strong> ${escapeHtml(anamnesis.currentMedications || '—')}</p>
      <p><strong>Histórico familiar:</strong> ${escapeHtml(anamnesis.familyHistory || '—')}</p>
      <p><strong>Histórico social:</strong> ${escapeHtml(anamnesis.socialHistory || '—')}</p>
      <p><strong>Cirurgias anteriores:</strong> ${escapeHtml(anamnesis.previousSurgeries || '—')}</p>
      <h2>Avaliação facial avançada</h2>
      <p><strong>Tipo de pele:</strong> ${escapeHtml(anamnesis.facialAssessment?.skinType || '—')}</p>
      <p><strong>Acne:</strong> ${escapeHtml(anamnesis.facialAssessment?.acne || '—')}</p>
      <p><strong>Qualidade da pele:</strong> ${escapeHtml(anamnesis.facialAssessment?.skinQuality || '—')}</p>
      <p><strong>Sensibilidade:</strong> ${escapeHtml(anamnesis.facialAssessment?.sensitivity || '—')}</p>
      <p><strong>Oleosidade:</strong> ${escapeHtml(anamnesis.facialAssessment?.oiliness || '—')}</p>
      <p><strong>Grau de envelhecimento:</strong> ${escapeHtml(anamnesis.facialAssessment?.agingDegree || '—')}</p>
      <h2>Procedimentos</h2>
      <p>${escapeHtml(selectedProcedures || '—')}</p>
      <h2>Observações</h2>
      <p>${escapeHtml(anamnesis.observations || '—')}</p>
      <p>${escapeHtml(anamnesis.clinicalNotes || '—')}</p>
      <div class="signature">${escapeHtml(anamnesis.digitalSignature || 'Assinatura digital')}</div>
    `;
  }

  async function handleSave() {
    setSaving(true);
    const data: Omit<Anamnesis, 'id' | 'createdAt'> = {
      patientId, date, mainComplaint, medicalHistory, allergies,
      currentMedications: currentMeds, familyHistory, socialHistory, previousSurgeries,
      vitalSigns: {},
      observations,
      facialAssessment,
      estheticProcedures,
      procedureDetails,
      clinicalNotes,
      aestheticPhotosBefore,
      aestheticPhotosAfter,
      digitalSignature,
      signatureDate: signatureDate || new Date().toISOString(),
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
                  <button onClick={() => printSavedAnamnesis(a)} className="text-zinc-600 hover:text-teal-400 transition-colors" title="Imprimir / salvar em PDF"><FileText size={13} /></button>
                  <button onClick={() => editRecord(a)} className="text-zinc-600 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => deleteAnamnesis(a.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                {a.allergies && <p className="col-span-2">Alergias: {a.allergies}</p>}
                {(a.estheticProcedures?.length ?? 0) > 0 && (
                  <p className="col-span-2 text-teal-400">
                    Procedimentos: {aestheticProcedureOptions.filter(option => a.estheticProcedures?.includes(option.id)).map(option => option.label).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <BackButton onClick={() => { setMode('list'); resetForm(); }} />

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-teal-400">Dados clínicos iniciais</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Data"><Input value={date} onChange={setDate} type="date" /></Field>
              <Field label="Queixa Principal"><Input value={mainComplaint} onChange={setMainComplaint} placeholder="Motivo da consulta" /></Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Histórico Médico"><Textarea value={medicalHistory} onChange={setMedicalHistory} placeholder="Doenças anteriores, condições crônicas..." rows={2} /></Field>
              <Field label="Alergias"><Input value={allergies} onChange={setAllergies} placeholder="Medicamentosa, ambiental..." /></Field>
              <Field label="Medicamentos Atuais"><Textarea value={currentMeds} onChange={setCurrentMeds} placeholder="Medicações em uso" rows={2} /></Field>
              <Field label="Histórico Familiar"><Textarea value={familyHistory} onChange={setFamilyHistory} placeholder="Doenças na família" rows={2} /></Field>
              <Field label="Histórico Social"><Textarea value={socialHistory} onChange={setSocialHistory} placeholder="Hábitos, profissão, estilo de vida..." rows={2} /></Field>
              <Field label="Cirurgias Anteriores"><Textarea value={previousSurgeries} onChange={setPreviousSurgeries} placeholder="Procedimentos cirúrgicos" rows={2} /></Field>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.12)' }}>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-amber-200">Avaliação facial avançada</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Tipo de pele">
                <SelectField value={facialAssessment.skinType} onChange={v => updateFacialAssessment('skinType', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Normal', label: 'Normal' }, { value: 'Seca', label: 'Seca' },
                  { value: 'Oleosa', label: 'Oleosa' }, { value: 'Mista', label: 'Mista' }, { value: 'Sensível', label: 'Sensível' },
                ]} />
              </Field>
              <Field label="Grau de acne">
                <SelectField value={facialAssessment.acne} onChange={v => updateFacialAssessment('acne', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Ausente', label: 'Ausente' }, { value: 'Leve', label: 'Leve' },
                  { value: 'Moderada', label: 'Moderada' }, { value: 'Intensa', label: 'Intensa' },
                ]} />
              </Field>
              <Field label="Qualidade da pele">
                <SelectField value={facialAssessment.skinQuality} onChange={v => updateFacialAssessment('skinQuality', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Boa hidratação', label: 'Boa hidratação' }, { value: 'Desidratada', label: 'Desidratada' },
                  { value: 'Textura irregular', label: 'Textura irregular' }, { value: 'Opaca', label: 'Opaca' }, { value: 'Viçosa', label: 'Viçosa' },
                ]} />
              </Field>
              <Field label="Sensibilidade">
                <SelectField value={facialAssessment.sensitivity} onChange={v => updateFacialAssessment('sensitivity', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Baixa', label: 'Baixa' }, { value: 'Moderada', label: 'Moderada' }, { value: 'Alta', label: 'Alta' },
                ]} />
              </Field>
              <Field label="Oleosidade">
                <SelectField value={facialAssessment.oiliness} onChange={v => updateFacialAssessment('oiliness', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Controlada', label: 'Controlada' }, { value: 'Zona T', label: 'Zona T' }, { value: 'Intensa', label: 'Intensa' },
                ]} />
              </Field>
              <Field label="Grau de envelhecimento">
                <SelectField value={facialAssessment.agingDegree} onChange={v => updateFacialAssessment('agingDegree', v)} options={[
                  { value: '', label: 'Selecionar' }, { value: 'Inicial', label: 'Inicial' }, { value: 'Leve', label: 'Leve' },
                  { value: 'Moderado', label: 'Moderado' }, { value: 'Avançado', label: 'Avançado' },
                ]} />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {facialBooleanFields.map(item => (
                <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-[12px] text-zinc-300 ring-1 ring-white/[0.06]">
                  <input type="checkbox" checked={Boolean(facialAssessment[item.key])} onChange={e => updateFacialAssessment(item.key, e.target.checked)} />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(6,78,59,0.16)', border: '1px solid rgba(20,184,166,0.12)' }}>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-teal-300">Procedimentos estéticos</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {aestheticProcedureOptions.map(option => (
                <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] text-zinc-300 ring-1 ring-white/[0.06]">
                  <input type="checkbox" checked={estheticProcedures.includes(option.id)} onChange={() => toggleEstheticProcedure(option.id)} />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {estheticProcedures.includes('botox') && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-2">
                  <Field label="Botox - Região aplicada"><Input value={procedureDetails.botox.region} onChange={v => updateProcedureDetail('botox', 'region', v)} /></Field>
                  <Field label="Quantidade de unidades"><Input value={procedureDetails.botox.units} onChange={v => updateProcedureDetail('botox', 'units', v)} /></Field>
                  <Field label="Marca utilizada"><Input value={procedureDetails.botox.brand} onChange={v => updateProcedureDetail('botox', 'brand', v)} /></Field>
                  <Field label="Retorno indicado"><Input value={procedureDetails.botox.followUp} onChange={v => updateProcedureDetail('botox', 'followUp', v)} /></Field>
                </div>
              )}
              {estheticProcedures.includes('pdoThreads') && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-2">
                  <Field label="Fios PDO - Tipo do fio"><Input value={procedureDetails.pdoThreads.threadType} onChange={v => updateProcedureDetail('pdoThreads', 'threadType', v)} /></Field>
                  <Field label="Quantidade"><Input value={procedureDetails.pdoThreads.quantity} onChange={v => updateProcedureDetail('pdoThreads', 'quantity', v)} /></Field>
                  <Field label="Região"><Input value={procedureDetails.pdoThreads.region} onChange={v => updateProcedureDetail('pdoThreads', 'region', v)} /></Field>
                  <Field label="Objetivo"><Input value={procedureDetails.pdoThreads.objective} onChange={v => updateProcedureDetail('pdoThreads', 'objective', v)} /></Field>
                </div>
              )}
              {estheticProcedures.includes('fullFace') && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-2">
                  <Field label="Full Face - Estratégia facial"><Textarea value={procedureDetails.fullFace.strategy} onChange={v => updateProcedureDetail('fullFace', 'strategy', v)} rows={2} /></Field>
                  <Field label="Áreas tratadas"><Textarea value={procedureDetails.fullFace.treatedAreas} onChange={v => updateProcedureDetail('fullFace', 'treatedAreas', v)} rows={2} /></Field>
                  <Field label="Quantidade de produto"><Input value={procedureDetails.fullFace.productAmount} onChange={v => updateProcedureDetail('fullFace', 'productAmount', v)} /></Field>
                </div>
              )}
              {estheticProcedures.includes('skinCleaning') && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-2">
                  <Field label="Limpeza - Grau de acne"><Input value={procedureDetails.skinCleaning.acneDegree} onChange={v => updateProcedureDetail('skinCleaning', 'acneDegree', v)} /></Field>
                  <Field label="Extração realizada"><Input value={procedureDetails.skinCleaning.extractionPerformed} onChange={v => updateProcedureDetail('skinCleaning', 'extractionPerformed', v)} /></Field>
                  <Field label="Produtos utilizados"><Textarea value={procedureDetails.skinCleaning.productsUsed} onChange={v => updateProcedureDetail('skinCleaning', 'productsUsed', v)} rows={2} /></Field>
                  <Field label="Reação da pele"><Textarea value={procedureDetails.skinCleaning.skinReaction} onChange={v => updateProcedureDetail('skinCleaning', 'skinReaction', v)} rows={2} /></Field>
                </div>
              )}
            </div>
          </div>

          <Field label="Observações"><Textarea value={observations} onChange={setObservations} placeholder="Notas gerais..." rows={2} /></Field>
          <Field label="Observações clínicas estéticas"><Textarea value={clinicalNotes} onChange={setClinicalNotes} placeholder="Planejamento, contraindicações, orientações e evolução estética..." rows={3} /></Field>

          <div className="grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['before', 'after'] as const).map(target => {
              const list = target === 'before' ? aestheticPhotosBefore : aestheticPhotosAfter;
              return (
                <div key={target}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{target === 'before' ? 'Fotos antes' : 'Fotos depois'}</p>
                    <label className="cursor-pointer rounded-lg bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200">
                      Upload
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleAnamnesisPhotoUpload(e, target)} />
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {list.map((src, index) => (
                      <button key={`${target}-${index}`} type="button" onClick={() => removeAnamnesisPhoto(target, index)} title="Remover foto">
                        <img src={src} alt="" className="aspect-square rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {photoProcessing && <p className="text-[11px] text-zinc-500">Compactando fotos...</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'rgba(250,204,21,0.035)', border: '1px solid rgba(250,204,21,0.12)' }}>
            <Field label="Assinatura digital"><Input value={digitalSignature} onChange={setDigitalSignature} placeholder="Nome completo do paciente/responsável" /></Field>
            <Field label="Data da assinatura"><Input value={signatureDate} onChange={setSignatureDate} type="date" /></Field>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={printAnamnesisPdf}>Baixar PDF / Imprimir</Button>
            <Button variant="ghost" size="sm" onClick={() => { setMode('list'); resetForm(); }}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving || photoProcessing} disabled={photoProcessing}>{current ? 'Atualizar' : 'Salvar'} Anamnese</Button>
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
  const { prescriptions, procedurePhotos, anamneses } = useApp();
  const [prescOpen, setPrescOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [anamOpen, setAnamOpen] = useState(false);
  const [fullRecordOpen, setFullRecordOpen] = useState(false);

  const patientPrescriptions = useMemo(() => [...prescriptions]
    .filter((prescription) => prescription.patientId === patient.id)
    .sort((left, right) => {
      const createdAtDelta = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }
      return right.date.localeCompare(left.date);
    }), [patient.id, prescriptions]);

  const patientPhotos = useMemo(() => [...procedurePhotos]
    .filter((photo) => photo.patientId === patient.id)
    .sort((left, right) => {
      const createdAtDelta = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }
      return right.procedureName.localeCompare(left.procedureName);
    }), [patient.id, procedurePhotos]);

  const patientAnamneses = useMemo(() => [...anamneses]
    .filter((anamnesis) => anamnesis.patientId === patient.id)
    .sort((left, right) => {
      const createdAtDelta = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }
      return right.date.localeCompare(left.date);
    }), [anamneses, patient.id]);

  const fullAddress = [
    patient.street,
    patient.number,
    patient.complement,
    patient.neighborhood,
    patient.city,
    patient.state,
  ].filter(Boolean).join(', ') || patient.address || '—';

  const renderRecordField = (label: string, value?: string | number) => (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 break-words text-[12px] leading-relaxed text-zinc-300">{value || '—'}</p>
    </div>
  );

  const renderRecordSection = (title: string, children: React.ReactNode) => (
    <section>
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-teal-400">{title}</h3>
      {children}
    </section>
  );

  const renderRecordMedia = (src: string, type: 'photo' | 'video', key: string) => (
    <div key={key} className="overflow-hidden rounded-lg bg-black/20">
      <div className="aspect-square">
        {type === 'photo' ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <video src={src} className="h-full w-full object-cover" muted controls />
        )}
      </div>
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={patient.name} subtitle="Prontuário do Paciente" maxWidth="max-w-2xl">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={patient.name} src={patient.profilePhoto} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold text-zinc-100 tracking-tight">{patient.name}</p>
              <Badge variant={statusVariant[patient.status]}>{statusLabel[patient.status]}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{item.label}</p>
                  <p className="text-[12px] text-zinc-300 mt-0.5 break-words">{item.value}</p>
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

          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.05] pt-4 sm:flex sm:flex-wrap">
            <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>Editar</Button>
            <Button size="sm" variant="secondary" icon={<FileText size={12} />} onClick={() => setFullRecordOpen(true)}>Prontuário completo</Button>
            <Button size="sm" variant="secondary" icon={<Clipboard size={12} />} onClick={() => setAnamOpen(true)}>Anamnese ({patientAnamneses.length})</Button>
            <Button size="sm" variant="secondary" icon={<Pill size={12} />} onClick={() => setPrescOpen(true)}>Receitas ({patientPrescriptions.length})</Button>
            <Button size="sm" variant="secondary" icon={<Camera size={12} />} onClick={() => setPhotosOpen(true)}>Fotos ({patientPhotos.length})</Button>
            <div className="col-span-2 sm:col-span-1">
              <PatientInsightsSummary patient={patient} label="Resumo Insight" />
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={fullRecordOpen} onClose={() => setFullRecordOpen(false)} title="Prontuário completo" subtitle={patient.name} maxWidth="max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={patient.name} src={patient.profilePhoto} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold text-zinc-100">{patient.name}</p>
              <p className="text-[12px] text-zinc-500">Cadastro criado em {formatProcedureDate(patient.createdAt)}</p>
            </div>
          </div>

          {renderRecordSection('Dados cadastrais', (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {renderRecordField('Nome', patient.name)}
              {renderRecordField('CPF', patient.cpf)}
              {renderRecordField('Nascimento', formatDate(patient.birthDate))}
              {renderRecordField('Sexo', patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : patient.sex)}
              {renderRecordField('Telefone', patient.phone)}
              {renderRecordField('WhatsApp', patient.whatsapp)}
              {renderRecordField('E-mail', patient.email)}
              {renderRecordField('Status', statusLabel[patient.status])}
              {renderRecordField('Total gasto', formatCurrency(patient.totalSpent))}
              <div className="sm:col-span-2 lg:col-span-3">{renderRecordField('Endereço', fullAddress)}</div>
              {renderRecordField('CEP', patient.zipCode)}
              {renderRecordField('Contato de emergência', patient.emergencyContact)}
              {renderRecordField('Relação', patient.emergencyRelation)}
              {renderRecordField('Telefone emergência', patient.emergencyPhone)}
            </div>
          ))}

          {renderRecordSection('Informações clínicas', (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderRecordField('Alergias', patient.allergies)}
              {renderRecordField('Medicamentos atuais', patient.currentMedications)}
              {renderRecordField('Histórico médico', patient.medicalHistory)}
              {renderRecordField('Observações', patient.observations)}
              <div className="sm:col-span-2">{renderRecordField('Procedimentos cadastrados', patient.procedures.join(', '))}</div>
              {renderRecordField('Última visita', formatDate(patient.lastVisit))}
              {renderRecordField('Próxima consulta', patient.nextAppointment ? formatDate(patient.nextAppointment) : '—')}
            </div>
          ))}

          {renderRecordSection(`Anamneses (${patientAnamneses.length})`, (
            patientAnamneses.length === 0 ? (
              <p className="rounded-xl bg-white/[0.03] p-4 text-[12px] text-zinc-600">Nenhuma anamnese registrada.</p>
            ) : (
              <div className="space-y-3">
                {patientAnamneses.map((anamnesis) => (
                  <div key={anamnesis.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-200">{formatDate(anamnesis.date)}</p>
                        <p className="text-[12px] text-zinc-500">{anamnesis.mainComplaint || 'Sem queixa principal'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[12px] text-zinc-400 sm:grid-cols-2">
                      <p><span className="text-zinc-600">Histórico:</span> {anamnesis.medicalHistory || '—'}</p>
                      <p><span className="text-zinc-600">Alergias:</span> {anamnesis.allergies || '—'}</p>
                      <p><span className="text-zinc-600">Medicamentos:</span> {anamnesis.currentMedications || '—'}</p>
                      <p><span className="text-zinc-600">Família:</span> {anamnesis.familyHistory || '—'}</p>
                      <p><span className="text-zinc-600">Social:</span> {anamnesis.socialHistory || '—'}</p>
                      <p><span className="text-zinc-600">Cirurgias:</span> {anamnesis.previousSurgeries || '—'}</p>
                      <p><span className="text-zinc-600">Observações:</span> {anamnesis.observations || '—'}</p>
                    </div>
                    {(anamnesis.facialAssessment || (anamnesis.estheticProcedures?.length ?? 0) > 0 || anamnesis.clinicalNotes) && (
                      <div className="mt-4 rounded-xl bg-black/10 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-200">Avaliação estética</p>
                        <div className="grid grid-cols-1 gap-2 text-[12px] text-zinc-400 sm:grid-cols-2">
                          <p><span className="text-zinc-600">Pele:</span> {anamnesis.facialAssessment?.skinType || '—'}</p>
                          <p><span className="text-zinc-600">Acne:</span> {anamnesis.facialAssessment?.acne || '—'}</p>
                          <p><span className="text-zinc-600">Qualidade:</span> {anamnesis.facialAssessment?.skinQuality || '—'}</p>
                          <p><span className="text-zinc-600">Envelhecimento:</span> {anamnesis.facialAssessment?.agingDegree || '—'}</p>
                          <p className="sm:col-span-2"><span className="text-zinc-600">Procedimentos:</span> {aestheticProcedureOptions.filter(option => anamnesis.estheticProcedures?.includes(option.id)).map(option => option.label).join(', ') || '—'}</p>
                          <p className="sm:col-span-2"><span className="text-zinc-600">Notas clínicas:</span> {anamnesis.clinicalNotes || '—'}</p>
                          <p className="sm:col-span-2"><span className="text-zinc-600">Assinatura:</span> {anamnesis.digitalSignature || '—'} {anamnesis.signatureDate ? `· ${formatProcedureDate(anamnesis.signatureDate)}` : ''}</p>
                        </div>
                        {((anamnesis.aestheticPhotosBefore?.length ?? 0) > 0 || (anamnesis.aestheticPhotosAfter?.length ?? 0) > 0) && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Antes</p>
                              <div className="grid grid-cols-4 gap-1">
                                {(anamnesis.aestheticPhotosBefore ?? []).map((src, index) => <img key={`anam-before-${index}`} src={src} alt="" className="aspect-square rounded-lg object-cover" />)}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Depois</p>
                              <div className="grid grid-cols-4 gap-1">
                                {(anamnesis.aestheticPhotosAfter ?? []).map((src, index) => <img key={`anam-after-${index}`} src={src} alt="" className="aspect-square rounded-lg object-cover" />)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}

          {renderRecordSection(`Receitas (${patientPrescriptions.length})`, (
            patientPrescriptions.length === 0 ? (
              <p className="rounded-xl bg-white/[0.03] p-4 text-[12px] text-zinc-600">Nenhuma receita registrada.</p>
            ) : (
              <div className="space-y-3">
                {patientPrescriptions.map((prescription) => (
                  <div key={prescription.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="mb-2 text-[13px] font-semibold text-zinc-200">{formatDate(prescription.date)}</p>
                    <div className="space-y-1">
                      {prescription.medications.map((medication, index) => (
                        <p key={`${prescription.id}-med-${index}`} className="text-[12px] text-zinc-400">
                          <span className="font-semibold text-teal-400">{medication.name}</span> · {medication.dosage || '—'} · {medication.frequency || '—'} · {medication.duration || '—'}
                        </p>
                      ))}
                    </div>
                    {prescription.instructions && <p className="mt-3 text-[12px] text-zinc-500">{prescription.instructions}</p>}
                  </div>
                ))}
              </div>
            )
          ))}

          {renderRecordSection(`Fotos e vídeos (${patientPhotos.length})`, (
            patientPhotos.length === 0 ? (
              <p className="rounded-xl bg-white/[0.03] p-4 text-[12px] text-zinc-600">Nenhum registro fotográfico.</p>
            ) : (
              <div className="space-y-3">
                {patientPhotos.map((photo) => {
                  const beforeMedia = [
                    ...photo.photosBefore.map((src, index) => renderRecordMedia(src, 'photo', `${photo.id}-full-before-photo-${index}`)),
                    ...(photo.videosBefore ?? []).map((src, index) => renderRecordMedia(src, 'video', `${photo.id}-full-before-video-${index}`)),
                  ];
                  const afterMedia = [
                    ...photo.photosAfter.map((src, index) => renderRecordMedia(src, 'photo', `${photo.id}-full-after-photo-${index}`)),
                    ...(photo.videosAfter ?? (photo.videoUrl ? [photo.videoUrl] : [])).map((src, index) => renderRecordMedia(src, 'video', `${photo.id}-full-after-video-${index}`)),
                  ];

                  return (
                    <div key={photo.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="mb-3">
                        <p className="text-[13px] font-semibold text-zinc-200">{photo.procedureName || 'Procedimento'}</p>
                        <p className="text-[11px] text-zinc-500">{formatProcedureDate(photo.createdAt)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Antes</p>
                          {beforeMedia.length > 0 ? <div className="grid grid-cols-3 gap-1">{beforeMedia}</div> : <p className="text-[11px] text-zinc-700">Sem mídia</p>}
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Depois</p>
                          {afterMedia.length > 0 ? <div className="grid grid-cols-3 gap-1">{afterMedia}</div> : <p className="text-[11px] text-zinc-700">Sem mídia</p>}
                        </div>
                      </div>
                      {photo.observations && <p className="mt-3 text-[12px] text-zinc-500">{photo.observations}</p>}
                    </div>
                  );
                })}
              </div>
            )
          ))}
        </div>
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
  const { pageParams } = useLayout();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null);

  useEffect(() => {
    if (!pageParams || typeof pageParams.patientId !== 'string') return;
    const patient = patients.find((item) => item.id === pageParams.patientId);
    if (patient) {
      setViewPatient(patient);
    }
  }, [pageParams, patients]);

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
    <div className="space-y-6 relative">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-[26px] font-extrabold text-zinc-50 tracking-tighter leading-none">Pacientes</h2>
              <BackButton to="dashboard" />
            </div>
          <p className="text-[13px] text-zinc-500 mt-2">{patients.length} pacientes cadastrados</p>
        </div>
        <div className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Novo Paciente</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl p-3 card-premium sm:flex-row sm:rounded-2xl sm:p-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl p-1 sm:flex sm:flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['all', 'active', 'inactive', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all sm:px-3 sm:text-[11px]"
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

      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium rounded-xl p-3.5">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="mt-3 h-8 w-3/4" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="card-premium rounded-xl p-8 text-center">
            <User size={28} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-[13px] text-zinc-500">Nenhum paciente encontrado</p>
          </div>
        ) : filtered.map((patient) => (
          <div key={patient.id} className="card-premium rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={patient.name} src={patient.profilePhoto} size="sm" />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setViewPatient(patient)}
                    className="block max-w-full truncate text-left text-[13px] font-semibold text-zinc-200 transition-colors hover:text-teal-300"
                  >
                    {patient.name}
                  </button>
                  <p className="truncate text-[11px] text-zinc-600">{patient.procedures.slice(0, 2).join(', ') || 'Sem procedimento'}</p>
                </div>
              </div>
              <Badge variant={statusVariant[patient.status]}>{statusLabel[patient.status]}</Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-white/[0.03] p-2">
                <p className="text-zinc-600">Contato</p>
                <p className="mt-0.5 truncate font-medium text-zinc-400">{patient.phone || patient.email || '—'}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2">
                <p className="text-zinc-600">Total gasto</p>
                <p className="mt-0.5 font-bold text-zinc-300">{formatCurrency(patient.totalSpent)}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1">
              <PatientInsightsSummary patient={patient} iconOnly />
              <button onClick={() => setDeleteConfirm(patient)} className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Excluir paciente"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium hidden overflow-hidden rounded-2xl md:block">
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
                className="transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={patient.name} src={patient.profilePhoto} size="sm" />
                    <div>
                      <button
                        type="button"
                        onClick={() => setViewPatient(patient)}
                        className="text-left text-[13px] font-semibold tracking-tight text-zinc-200 transition-colors hover:text-teal-300"
                      >
                        {patient.name}
                      </button>
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
                    <PatientInsightsSummary patient={patient} iconOnly />
                    <button onClick={() => setDeleteConfirm(patient)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Excluir paciente"><Trash2 size={14} /></button>
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
