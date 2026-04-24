# Sistema de Agendamento Clínico - Documentação

## Visão Geral

Sistema backend completo para gerenciamento de agendamentos em clínicas com validações de conflito de horário, controle de disponibilidade profissional, lista de espera e múltiplas operações de agendamento.

## Estrutura do Banco de Dados

### Tabelas Principais

#### `patients` - Pacientes
```sql
- id (UUID, PK)
- name (text)
- email (text, unique)
- phone (text)
- birth_date (date)
- last_visit (timestamptz)
- status ('active' | 'inactive' | 'pending')
- total_spent (numeric)
- notes (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `professionals` - Profissionais
```sql
- id (UUID, PK)
- name (text)
- specialty (text)
- email (text, unique)
- phone (text)
- rating (numeric 0-5)
- active (boolean)
- available_days (text[]) - [0-6] dias da semana
- start_time (time) - Horário início expediente
- end_time (time) - Horário fim expediente
- lunch_start (time) - Início almoço
- lunch_end (time) - Fim almoço
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `services` - Serviços/Procedimentos
```sql
- id (UUID, PK)
- name (text)
- description (text)
- duration_minutes (integer)
- price (numeric)
- active (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `appointments` - Agendamentos
```sql
- id (UUID, PK)
- patient_id (UUID, FK → patients)
- professional_id (UUID, FK → professionals)
- service_id (UUID, FK → services)
- appointment_date (date)
- appointment_time (time)
- end_time (time)
- duration_minutes (integer)
- status ('pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show')
- notes (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE: (professional_id, appointment_date, appointment_time)
```

#### `appointment_slots` - Bloqueios de Horários
```sql
- id (UUID, PK)
- appointment_id (UUID, FK → appointments)
- professional_id (UUID, FK → professionals)
- slot_date (date)
- slot_start (time)
- slot_end (time)
- created_at (timestamptz)
```

#### `waitlist` - Lista de Espera
```sql
- id (UUID, PK)
- patient_id (UUID, FK → patients)
- professional_id (UUID, FK → professionals)
- service_id (UUID, FK → services)
- preferred_date_start (date)
- preferred_date_end (date)
- preferred_time (text)
- notes (text)
- position (integer)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## Regras de Negócio

### 1. Prevenção de Conflitos de Horário
- Verifica se existe outro agendamento confirmado no mesmo horário
- Considera a duração completa do serviço
- Bloqueia automaticamente slots ocupados via `appointment_slots`

### 2. Validação de Disponibilidade Profissional
- Verifica dias da semana disponíveis (`available_days`)
- Respeita horário de expediente (início e fim)
- Bloqueia período de almoço

### 3. Intervalo Entre Consultas
- Agendamentos não podem se sobrepor
- Diferença calculada automaticamente baseada na duração do serviço

### 4. Status de Agendamento
- `pending`: Aguardando confirmação
- `confirmed`: Confirmado e bloqueado no calendário
- `completed`: Realizado
- `cancelled`: Cancelado
- `no_show`: Paciente não compareceu

### 5. Lista de Espera
- Ativada quando não há horários disponíveis
- Mantém posição ordenada
- Permite campos de preferência (data/hora)

## API - Edge Function

### Endpoint
```
POST /functions/v1/appointments
```

### Ações Disponíveis

#### 1. Criar Agendamento
```javascript
{
  action: "create_appointment",
  patientId: "uuid",
  professionalId: "uuid",
  serviceId: "uuid",
  appointmentDate: "2024-04-20",
  appointmentTime: "09:00",
  notes?: "Observações"
}
```

**Validações:**
- Profissional existe e está ativo
- Data é um dia disponível
- Horário dentro do expediente
- Não sobrepõe almoço
- Sem conflitos com outros agendamentos
- Duração respeita horários de trabalho

**Resposta (Sucesso):**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "patient_id": "uuid",
    "professional_id": "uuid",
    "service_id": "uuid",
    "appointment_date": "2024-04-20",
    "appointment_time": "09:00",
    "end_time": "09:30",
    "duration_minutes": 30,
    "status": "confirmed",
    "created_at": "2024-04-17T10:00:00Z"
  }
}
```

#### 2. Cancelar Agendamento
```javascript
{
  action: "cancel_appointment",
  appointmentId: "uuid",
  reason?: "Cancelado por pedido do paciente"
}
```

**Efeitos:**
- Muda status para `cancelled`
- Remove bloqueios de tempo (`appointment_slots`)
- Libera horário para novos agendamentos

**Resposta:**
```json
{
  "success": true
}
```

#### 3. Reagendar Agendamento
```javascript
{
  action: "reschedule_appointment",
  appointmentId: "uuid",
  newDate: "2024-04-25",
  newTime: "14:00"
}
```

**Validações:**
- Agendamento existe
- Nova data/hora está disponível
- Mesmas validações de novo agendamento

**Resposta:**
```json
{
  "success": true
}
```

#### 4. Listar Horários Disponíveis
```javascript
{
  action: "get_available_slots",
  professionalId: "uuid",
  date: "2024-04-20",
  intervalMinutes: 30  // opcional, padrão 30
}
```

**Resposta:**
```json
{
  "success": true,
  "slots": [
    { "time": "08:00", "available": true },
    { "time": "08:30", "available": true },
    { "time": "09:00", "available": false },
    { "time": "09:30", "available": true },
    { "time": "12:00", "available": false },  // almoço
    { "time": "13:00", "available": true }
  ]
}
```

#### 5. Adicionar à Lista de Espera
```javascript
{
  action: "add_to_waitlist",
  patientId: "uuid",
  professionalId: "uuid",
  serviceId: "uuid",
  preferredDateStart: "2024-05-01",
  preferredDateEnd?: "2024-05-15",
  preferredTime?: "14:00",
  notes?: "Observações"
}
```

**Resposta:**
```json
{
  "success": true,
  "position": 3,
  "waitlistEntry": {
    "id": "uuid",
    "patient_id": "uuid",
    "position": 3,
    "created_at": "2024-04-17T10:00:00Z"
  }
}
```

#### 6. Listar Lista de Espera
```javascript
{
  action: "get_waitlist",
  professionalId: "uuid"
}
```

**Resposta:**
```json
{
  "success": true,
  "waitlist": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "position": 1,
      "preferred_date_start": "2024-05-01",
      "created_at": "2024-04-17T10:00:00Z"
    }
  ]
}
```

#### 7. Remover da Lista de Espera
```javascript
{
  action: "remove_from_waitlist",
  waitlistId: "uuid"
}
```

**Resposta:**
```json
{
  "success": true
}
```

#### 8. Agendamentos do Paciente
```javascript
{
  action: "get_patient_appointments",
  patientId: "uuid"
}
```

**Resposta:**
```json
{
  "success": true,
  "appointments": [
    {
      "id": "uuid",
      "appointment_date": "2024-04-20",
      "appointment_time": "09:00",
      "status": "confirmed"
    }
  ]
}
```

#### 9. Agenda do Profissional
```javascript
{
  action: "get_professional_schedule",
  professionalId: "uuid",
  date: "2024-04-20"
}
```

**Resposta:**
```json
{
  "success": true,
  "appointments": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "appointment_time": "09:00",
      "end_time": "09:30",
      "status": "confirmed"
    }
  ]
}
```

## Usando o Serviço Frontend

### Importar
```typescript
import {
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
  addToWaitlist,
  getWaitlist,
  removeFromWaitlist,
  getPatientAppointments,
  getProfessionalSchedule,
} from '@/services/appointmentService';
```

### Exemplos

#### Criar Agendamento
```typescript
const result = await createAppointment({
  patientId: '123',
  professionalId: '456',
  serviceId: '789',
  appointmentDate: '2024-04-20',
  appointmentTime: '09:00',
  notes: 'Primeira consulta'
});

if (result.success) {
  console.log('Agendamento criado:', result.appointment);
} else {
  console.error('Erro:', result.error);
}
```

#### Listar Horários Disponíveis
```typescript
const slots = await getAvailableSlots('prof-id', '2024-04-20', 30);
// Retorna array de { time: string, available: boolean }
```

#### Adicionar à Lista de Espera
```typescript
const result = await addToWaitlist(
  'patient-id',
  'prof-id',
  'service-id',
  '2024-05-01',
  '2024-05-15',
  '14:00'
);

if (result.success) {
  console.log(`Paciente em posição ${result.position}`);
}
```

## Tratamento de Erros

Todos os erros são retornados com estrutura:
```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

**Erros Comuns:**
- `"Professional not found"` - Profissional não existe
- `"Professional not available on this day"` - Dia não é disponível
- `"Appointment time outside professional working hours"` - Fora do horário
- `"Appointment conflicts with lunch break"` - Conflita com almoço
- `"Time slot already booked"` - Horário já ocupado
- `"Appointment not found"` - Agendamento não existe

## Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Políticas restritivas por padrão
- Validação de dados na aplicação e no banco
- Service role key apenas para operações críticas
- CORS configurado para chamadas cross-origin

## Performance

- Índices em colunas frequentemente consultadas
- Queries otimizadas com filtros específicos
- Appointment_slots para rápida detecção de conflitos
- Paginação implícita em listagens

## Próximos Passos

1. Integrar notificações (email/SMS) ao criar/cancelar agendamentos
2. Implementar confirmação de agendamento por SMS
3. Adicionar lembretes automáticos antes da consulta
4. Criar dashboard de utilização de horários
5. Relatórios de faturamento por serviço/profissional
