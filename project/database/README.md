# 📦 Database Local - Clinic Organizer Pro

## Estrutura

```
database/
├── local-database.ts   # Classe principal do banco local
├── index.ts            # Exports do módulo
└── README.md            # Este arquivo
```

## Como Funciona

O sistema usa **localStorage** do navegador para armazenar todos os dados:

- `clinic_pro_patients` - Pacientes
- `clinic_pro_appointments` - Agendamentos
- `clinic_pro_incomes` - Receitas
- `clinic_pro_expenses` - Despesas
- `clinic_pro_campaigns` - Campanhas
- `clinic_pro_professionals` - Profissionais
- `clinic_pro_procedures` - Procedimentos
- `clinic_pro_settings` - Configurações
- `clinic_pro_notifications` - Notificações

## Uso

```typescript
import { DB, Patient } from './database';

// Salvar paciente
const patient = DB.savePatient({
  name: 'João Silva',
  phone: '11999999999',
  status: 'active',
  // ... outros campos
});

// Buscar pacientes
const patients = DB.getPatients();

// Atualizar
DB.updatePatient(id, { name: 'Novo Nome' });

// Deletar
DB.deletePatient(id);

// Exportar todos os dados
const json = DB.exportData();

// Importar dados
DB.importData(jsonString);
```

## Sem Supabase

Este sistema funciona 100% offline usando localStorage.
Não requer configuração de banco de dados externo.
