import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Patient } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import aiService from '../../services/aiService';

type Props = { patient: Patient; label?: string; iconOnly?: boolean };

function buildPatientText(patient: Patient) {
  const parts: string[] = [];
  parts.push(`Paciente: ${patient.name ?? ''}`);
  if (patient.phone) parts.push(`Telefone: ${patient.phone}`);
  if (patient.email) parts.push(`E-mail: ${patient.email}`);
  if (patient.birthDate) parts.push(`Nascimento: ${patient.birthDate}`);
  if (patient.cpf) parts.push(`CPF: ${patient.cpf}`);
  if (patient.sex) parts.push(`Sexo: ${patient.sex}`);
  if (patient.observations) parts.push(`Observações: ${patient.observations}`);
  if (Array.isArray(patient.procedures) && patient.procedures.length > 0) parts.push(`Procedimentos: ${patient.procedures.join(', ')}`);
  if (patient.lastVisit) parts.push(`Última visita: ${patient.lastVisit}`);
  parts.push(`Total gasto: ${patient.totalSpent ?? 0}`);
  return parts.join('\n');
}

function buildLocalSummary(patient: Patient) {
  return [
    'Resumo local do paciente',
    '',
    `Paciente: ${patient.name ?? ''}`,
    patient.phone ? `Telefone: ${patient.phone}` : null,
    patient.email ? `E-mail: ${patient.email}` : null,
    patient.birthDate ? `Nascimento: ${patient.birthDate}` : null,
    patient.cpf ? `CPF: ${patient.cpf}` : null,
    patient.sex ? `Sexo: ${patient.sex}` : null,
    patient.lastVisit ? `Última visita: ${patient.lastVisit}` : null,
    Array.isArray(patient.procedures) && patient.procedures.length > 0
      ? `Procedimentos: ${patient.procedures.join(', ')}`
      : null,
    `Total gasto: ${patient.totalSpent ?? 0}`,
    '',
    'A IA online não pôde ser acessada no momento, então este resumo foi montado com os dados do paciente cadastrados no sistema.',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function PatientInsightsSummary({ patient, label = 'IA', iconOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setSummary(null);
    try {
      const patientText = buildPatientText(patient);
      const res = await aiService.summarizeAppointment(undefined, patientText);
      const s = res?.summary ?? (typeof res === 'string' ? res : JSON.stringify(res));
      setSummary(s);
    } catch {
      setSummary(buildLocalSummary(patient));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Resumo do paciente"
        title="Resumo do paciente"
        onClick={() => { setOpen(true); if (!summary) generate(); }}
      >
        {iconOnly ? <FileText size={14} /> : label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Resumo — ${patient.name}`}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
            <Button size="sm" onClick={generate} loading={loading}>Gerar resumo</Button>
          </>
        }
      >
        <div className="space-y-3">
          {summary ? (
            <pre className="whitespace-pre-wrap text-sm text-zinc-200 bg-[#0d0e14] p-3 rounded-md">{summary}</pre>
          ) : (
            <p className="text-sm text-zinc-500">Clique em "Gerar resumo" para obter o resumo de IA do paciente.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
