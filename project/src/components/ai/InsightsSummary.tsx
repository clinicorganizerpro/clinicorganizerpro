import { useState } from 'react';
import { Appointment } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import aiService from '../../services/aiService';

type Props = {
  appointment: Appointment;
};

function buildAppointmentText(appointment: Appointment) {
  return [
    `Paciente: ${appointment.patientName}`,
    `Procedimento: ${appointment.procedure}`,
    `Data: ${appointment.date}`,
    `Horário: ${appointment.time}`,
    `Duração: ${appointment.duration} minutos`,
    `Profissional: ${appointment.professional}`,
    `Status: ${appointment.status}`,
    `Valor: R$ ${appointment.value.toFixed(2)}`,
    appointment.notes ? `Observações: ${appointment.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildLocalSummary(appointment: Appointment) {
  const appointmentDateTime = [appointment.date, appointment.time].filter(Boolean).join(' às ');
  const value = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(appointment.value);

  return [
    'Resumo local da consulta',
    '',
    `Paciente: ${appointment.patientName}`,
    `Procedimento: ${appointment.procedure}`,
    `Data: ${appointmentDateTime || appointment.date}`,
    `Duração: ${appointment.duration} minutos`,
    `Profissional: ${appointment.professional}`,
    `Status: ${appointment.status}`,
    `Valor: ${value}`,
    appointment.notes ? `Observações: ${appointment.notes}` : null,
    '',
    'A IA online não pôde ser acessada no momento, então este resumo foi montado com os dados da consulta cadastrados no sistema.',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function InsightsSummary({ appointment }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setSummary(null);

    const appointmentText = buildAppointmentText(appointment);

    try {
      const res = await aiService.summarizeAppointment(appointment.id, appointmentText);
      const s = res?.summary ?? (typeof res === 'string' ? res : JSON.stringify(res));
      setSummary(s);
    } catch {
      setSummary(buildLocalSummary(appointment));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(true); if (!summary) generate(); }}>
        Resumo IA
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Resumo — ${appointment.patientName}`}
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
            <p className="text-sm text-zinc-500">Clique em "Gerar resumo" para obter o resumo de IA.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
