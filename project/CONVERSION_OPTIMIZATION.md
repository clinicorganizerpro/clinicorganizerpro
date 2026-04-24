# Sistema de Otimização de Conversão - Documentação

## Visão Geral

Sistema inteligente que aumenta a taxa de conversão de agendamentos através de sugestões automáticas, alertas de urgência e gerenciamento inteligente de lista de espera com notificações.

## Estrutura do Banco de Dados

### Novas Tabelas

#### `waitlist_notifications` - Notificações de Lista de Espera
```sql
- id (UUID, PK)
- waitlist_id (UUID, FK → waitlist)
- patient_id (UUID, FK → patients)
- professional_id (UUID, FK → professionals)
- notification_type ('slot_available' | 'urgency_warning' | 'reminder')
- message (text)
- sent_at (timestamptz)
- read_at (timestamptz, nullable)
- conversion_success (boolean)
- created_at (timestamptz)
```

#### `availability_snapshots` - Histórico de Disponibilidade
```sql
- id (UUID, PK)
- professional_id (UUID, FK → professionals)
- snapshot_date (date)
- total_slots (integer)
- available_slots (integer)
- urgency_level ('high' | 'medium' | 'low')
- captured_at (timestamptz)
- UNIQUE: (professional_id, snapshot_date)
```

### Colunas Adicionadas

#### `waitlist`
- `contact_phone` (text) - Telefone do paciente
- `contact_email` (text) - Email do paciente
- `notification_sent` (boolean) - Se notificação foi enviada
- `conversion_slot_id` (UUID, FK → appointments) - Slot gerado pela conversão
- `converted_at` (timestamptz) - Quando paciente confirmou agendamento

#### `appointments`
- `conversion_source` (text) - Origem do agendamento: `direct`, `waitlist`, `suggestion`, `urgency_trigger`

## Estratégias de Conversão

### 1. Sugestões Automáticas Inteligentes
Sistema que detecta e recomenda o melhor horário disponível baseado em:

- **Proximidade**: Hoje > Amanhã > Próximos dias
- **Disponibilidade**: Mais slots = melhor score
- **Urgência**: Poucos slots disponíveis = recomendação mais forte

**Tipos de Sugestões:**

#### Next Available (Próximo Horário)
```
"Próximo horário disponível hoje às 14:00"
- Maior relevância para conversão
- Atualizado em tempo real
- Mostra data e hora exata
```

#### Last Slots (Últimas Vagas)
```
"Apenas 2 vagas disponíveis - Reserve agora!"
- Ativa gatilho de urgência FOMO
- Aparece quando ≤ 2 slots
- Incentiva decisão imediata
```

#### Urgency Warning (Horários Esgotando)
```
"Horários quase esgotando - Os próximos dias têm alta demanda"
- Mostra quando 3+ dias têm ≤ 3 slots
- Incentiva reagendamento antecipado
- Lista 5 melhores opções
```

### 2. Alertas de Urgência em Tempo Real

**Cálculo de Urgência:**
- **HIGH** (≤ 10% disponível): "⚠️ Apenas 1 vaga - Reserve agora!"
- **MEDIUM** (10-25%): "3 vagas disponíveis - Escolha logo"
- **LOW** (> 25%): "8 horários disponíveis"

**Captura de Snapshots:**
- Armazena estado de disponibilidade
- Permite análise histórica
- Mede tendências de demanda

### 3. Gerenciamento Inteligente de Lista de Espera

#### Fluxo de Conversão:
```
1. Paciente entra na lista de espera
2. Sistema captura: Nome, Telefone, Email
3. Quando vaga surge → Notificação automática
4. Paciente confirma → Agendamento criado
5. Conversão rastreada com origem "waitlist"
```

#### Notificações Automáticas:
```javascript
// slot_available
"Ótima notícia! Uma vaga abriu com Dr. Silva em 05/04 às 14:00"

// urgency_warning
"Última chance! Apenas 1 vaga restante com Dr. Silva hoje"

// reminder
"Não se esqueça - Você está na fila para Dr. Silva. Vagas podem surgir em breve!"
```

#### Tracking de Conversão:
- Qual paciente converteu
- De qual lista de espera
- Qual agendamento resultante
- Quando a conversão aconteceu

## API - Edge Function

### Endpoint
```
POST /functions/v1/conversion
```

### Ações Disponíveis

#### 1. Obter Sugestões Inteligentes
```javascript
{
  action: "get_smart_suggestions",
  professionalId: "uuid",
  serviceId: "uuid",
  daysAhead: 7  // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "suggestions": [
    {
      "type": "next_available",
      "title": "Próximo horário disponível",
      "description": "Hoje às 14:00",
      "icon": "Clock",
      "urgencyLevel": "high",
      "slots": [
        {
          "date": "2024-04-20",
          "time": "14:00",
          "availableSlotsInDay": 2,
          "totalSlotsInDay": 8,
          "recommendationScore": 95
        }
      ],
      "professionalId": "uuid",
      "serviceId": "uuid"
    },
    {
      "type": "last_slots",
      "title": "Últimas vagas",
      "description": "Apenas 2 horários disponíveis - Reserve agora!",
      "icon": "AlertCircle",
      "urgencyLevel": "high",
      "slots": [...]
    },
    {
      "type": "urgency_warning",
      "title": "Horários quase esgotando",
      "description": "Os próximos dias têm alta demanda",
      "icon": "Zap",
      "urgencyLevel": "high",
      "slots": [...]
    }
  ]
}
```

#### 2. Verificar Urgência de Disponibilidade
```javascript
{
  action: "check_availability_urgency",
  professionalId: "uuid",
  date: "2024-04-20"
}
```

**Resposta:**
```json
{
  "success": true,
  "alert": {
    "professionalId": "uuid",
    "date": "2024-04-20",
    "availableSlots": 2,
    "totalSlots": 8,
    "urgencyLevel": "high",
    "slotsPercentage": 25,
    "message": "⚠️ Apenas 2 vagas disponíveis - Reserve agora!"
  }
}
```

#### 3. Enviar Notificação de Waitlist
```javascript
{
  action: "send_waitlist_notification",
  waitlistId: "uuid",
  patientId: "uuid",
  professionalId: "uuid",
  notificationType: "slot_available",  // ou "urgency_warning", "reminder"
  message: "Ótima notícia! Uma vaga abriu com Dr. Silva"
}
```

**Resposta:**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "waitlist_id": "uuid",
    "notification_type": "slot_available",
    "message": "...",
    "sent_at": "2024-04-17T10:00:00Z"
  }
}
```

#### 4. Rastrear Conversão de Waitlist
```javascript
{
  action: "track_conversion",
  waitlistId: "uuid",
  appointmentId: "uuid"
}
```

**Efeitos:**
- Marca waitlist como convertida
- Define agendamento com `conversion_source: 'waitlist'`
- Registra timestamp de conversão

**Resposta:**
```json
{
  "success": true
}
```

#### 5. Obter Notificações de Paciente
```javascript
{
  action: "get_waitlist_notifications",
  patientId: "uuid"
}
```

**Resposta:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "notification_type": "slot_available",
      "message": "Ótima notícia! Uma vaga abriu",
      "sent_at": "2024-04-17T10:00:00Z",
      "read_at": null,
      "conversion_success": false
    }
  ]
}
```

#### 6. Marcar Notificação como Lida
```javascript
{
  action: "mark_notification_read",
  patientId: "uuid"
}
```

#### 7. Obter Métricas Profissional
```javascript
{
  action: "get_professional_metrics",
  professionalId: "uuid",
  daysAhead: 7  // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "metrics": {
    "totalAvailableSlots": 15,
    "totalSlots": 40,
    "occupancyRate": 62.5,
    "nextAvailableDate": "2024-04-20",
    "urgencyDays": 2,
    "daysWithSlots": ["2024-04-20", "2024-04-21", "2024-04-22"]
  }
}
```

#### 8. Obter Métricas de Conversão
```javascript
{
  action: "get_conversion_metrics",
  professionalId: "uuid"
}
```

**Resposta:**
```json
{
  "success": true,
  "metrics": {
    "totalConversions": 12,
    "totalAppointments": 45,
    "conversionRate": 26.67,
    "conversionBySource": {
      "waitlist": 8,
      "suggestion": 3,
      "urgency_trigger": 1
    }
  }
}
```

## Usando o Serviço Frontend

### Importar
```typescript
import {
  getSmartSuggestions,
  checkAvailabilityUrgency,
  sendWaitlistNotification,
  getWaitlistNotifications,
  markNotificationAsRead,
  trackConversionFromWaitlist,
  getProfessionalAvailabilityMetrics,
  getConversionMetrics,
} from '@/services/conversionService';
```

### Exemplos

#### Exibir Sugestões Automáticas
```typescript
const suggestions = await getSmartSuggestions(professionalId, serviceId, 7);

// Renderizar no UI
suggestions.forEach(suggestion => {
  console.log(`${suggestion.icon} ${suggestion.title}`);
  console.log(suggestion.description);

  if (suggestion.urgencyLevel === 'high') {
    // Destacar em vermelho/alarme
  }
});
```

#### Mostrar Alerta de Urgência
```typescript
const alert = await checkAvailabilityUrgency(professionalId, date);

if (alert?.urgencyLevel === 'high') {
  showUrgencyBanner(alert.message);  // "⚠️ Apenas 2 vagas!"
}
```

#### Adicionar à Waitlist com Notificações
```typescript
const result = await addToWaitlist(
  patientId,
  professionalId,
  serviceId,
  '2024-05-01',
  '2024-05-15'
);

// Quando vaga surgir, enviar notificação
if (slotAvailable) {
  await sendWaitlistNotification(
    result.waitlistEntry.id,
    patientId,
    professionalId,
    'Ótima notícia! Uma vaga abriu com Dr. Silva em 05/04 às 14:00',
    'slot_available'
  );
}
```

#### Rastrear Conversão
```typescript
// Quando paciente confirma agendamento da lista de espera
const appointment = await createAppointment({
  patientId,
  professionalId,
  serviceId,
  appointmentDate,
  appointmentTime
});

// Rastrear origem
await trackConversionFromWaitlist(waitlistId, appointment.id);

// Verificar taxa de conversão
const metrics = await getConversionMetrics(professionalId);
console.log(`Taxa de conversão: ${metrics.conversionRate}%`);
```

## Estratégias de Implementação UI

### 1. Widget de Sugestões
```tsx
<ConversionSuggestions>
  {/* Próximo horário com destaque */}
  <Badge urgency="high">Hoje às 14:00</Badge>

  {/* Últimas vagas com animação */}
  <PulseAlert>Apenas 2 vagas!</PulseAlert>

  {/* CTA principal */}
  <Button primary>Agendar Agora</Button>
</ConversionSuggestions>
```

### 2. Alerta de Urgência
```tsx
{alert?.urgencyLevel === 'high' && (
  <WarningBanner className="bg-red-50 border-red-200">
    <AlertTriangle className="text-red-600" />
    <span>{alert.message}</span>
  </WarningBanner>
)}
```

### 3. Centro de Notificações
```tsx
<NotificationCenter>
  {notifications.map(notif => (
    <NotificationCard
      key={notif.id}
      onClick={() => markAsRead(notif.id)}
      unread={!notif.read_at}
    >
      <NotificationIcon type={notif.notification_type} />
      <NotificationText>{notif.message}</NotificationText>
      <ConversionCTA>Confirmar Agora</ConversionCTA>
    </NotificationCard>
  ))}
</NotificationCenter>
```

## KPIs e Métricas

### Métricas de Acompanhamento
1. **Taxa de Conversão de Waitlist**: % pacientes em fila que agendam
2. **Tempo de Conversão**: Quanto tempo até conversão após notificação
3. **Taxa de Clique em Sugestões**: % usuários que clicam em sugestões
4. **Taxa de Urgência**: % pacientes que agendam quando em urgência
5. **Ocupação Média**: % de slots ocupados por profissional

### Dashboard de Conversão
```
[Profissional] [Taxa Conversão] [Ocupação] [Próx. Disponível]
Dr. Silva        32%             78%       Hoje 14:00
Dr. João         18%             45%       Amanhã 09:00
Dra. Maria       41%             92%       05/04 10:00
```

## Fluxo de Uso Completo

### Cenário: Paciente Não Encontra Horário

1. **Visitante vê sugestões** → "Próximo horário disponível em 3 dias"
2. **Urgência é mostrada** → "Apenas 2 vagas nessa data"
3. **FOMO é ativado** → "Últimas vagas" com pulsação
4. **Paciente entra em waitlist** → Captura nome, telefone, email
5. **Vaga surge** → Notificação em tempo real
6. **Paciente confirma** → Agendamento criado e rastreado
7. **Métrica registrada** → Conversão de waitlist computada

## Próximos Passos

1. Integrar SMS/Push notifications para alertas em tempo real
2. Enviar lembretes automáticos 24h antes do agendamento
3. A/B testing de mensagens de urgência
4. Análise preditiva de demanda (ML)
5. Incentivos (desconto) para confirmação rápida de waitlist
6. Integração com WhatsApp para notificações
7. Dashboard de conversão com gráficos em tempo real
