export type MessageVariable = '{nome}' | '{data}' | '{horario}' | '{procedimento}' | '{clinica}' | '{telefone}';

export type AutomationType =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'post_care'
  | 'reactivation'
  | 'birthday';

export type CampaignAudience = 'all' | 'inactive' | 'recent' | 'vip';
export type MessageChannel = 'whatsapp' | 'sms' | 'email';
export type SendStatus = 'sent' | 'pending' | 'failed' | 'scheduled';

export interface MessageTemplate {
  id: string;
  name: string;
  type: AutomationType;
  content: string;
  active: boolean;
  triggerDescription: string;
  sentCount: number;
  openRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  audience: CampaignAudience;
  channel: MessageChannel;
  status: 'draft' | 'active' | 'sent' | 'scheduled';
  sentCount?: number;
  openRate?: number;
  scheduledAt?: string;
  createdAt: string;
  message: string;
}

export interface MessageLog {
  id: string;
  patientName: string;
  type: AutomationType | 'campaign';
  campaignName?: string;
  channel: MessageChannel;
  status: SendStatus;
  sentAt: string;
  message: string;
}

export function interpolate(template: string, vars: Partial<Record<MessageVariable, string>>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value ?? key);
  }
  return result;
}

export const VARIABLES: { key: MessageVariable; label: string; example: string }[] = [
  { key: '{nome}', label: 'Nome do paciente', example: 'Ana Beatriz' },
  { key: '{data}', label: 'Data da consulta', example: '22/04/2024' },
  { key: '{horario}', label: 'Horário', example: '09:00' },
  { key: '{procedimento}', label: 'Procedimento', example: 'Botox' },
  { key: '{clinica}', label: 'Nome da clínica', example: 'Clínica Estética Premium' },
  { key: '{telefone}', label: 'Telefone da clínica', example: '(11) 3456-7890' },
];
