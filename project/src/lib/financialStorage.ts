import type { Expense, Income } from '../types';
import { localApiCreate, localApiDelete, localApiList, localApiUpdate } from './localApiClient';

const INCOME_STORAGE_KEY = 'incomes';
const EXPENSE_STORAGE_KEY = 'expenses';

type RecordInput = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const getStorageKey = (key: string, userId?: string) => {
  return userId ? `${key}:${userId}` : key;
};

const getCurrentTimestamp = () => new Date().toISOString();

const readString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
};

const readNumber = (fallback: number, ...values: unknown[]) => {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeIncomeStatus = (value: unknown): Income['status'] => {
  return value === 'paid' ? 'paid' : 'pending';
};

const normalizeExpenseStatus = (value: unknown): Expense['status'] => {
  return value === 'paid' ? 'paid' : 'pending';
};

const normalizeIncome = (value: unknown): Income | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  if (value.id.startsWith('expense_') || 'description' in value) {
    return null;
  }

  const createdAt = readString(value.createdAt, value.created_at) || getCurrentTimestamp();

  return {
    id: value.id,
    patientId: readString(value.patientId, value.patient_id) || undefined,
    patientName: readString(value.patientName, value.patient_name),
    service: readString(value.service),
    paymentMethod:
      value.paymentMethod === 'cartao' ||
      value.paymentMethod === 'dinheiro' ||
      value.paymentMethod === 'stripe'
        ? value.paymentMethod
        : 'pix',
    amount: readNumber(0, value.amount),
    status: normalizeIncomeStatus(value.status),
    attendanceDate: readString(value.attendanceDate, value.attendance_date),
    observations: readString(value.observations, value.notes),
    createdAt,
  };
};

const normalizeExpense = (value: unknown): Expense | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  if (value.id.startsWith('income_') || 'patientName' in value || 'patient_name' in value || 'service' in value) {
    return null;
  }

  const createdAt = readString(value.createdAt, value.created_at) || getCurrentTimestamp();

  return {
    id: value.id,
    description: readString(value.description),
    category: value.category === 'fixa' ? 'fixa' : 'variavel',
    amount: readNumber(0, value.amount),
    date: readString(value.date),
    paymentMethod:
      value.paymentMethod === 'cartao' ||
      value.paymentMethod === 'dinheiro' ||
      value.paymentMethod === 'transferencia' ||
      value.paymentMethod === 'outro'
        ? value.paymentMethod
        : 'pix',
    status: normalizeExpenseStatus(value.status),
    observations: readString(value.observations, value.notes),
    createdAt,
  };
};

const readStoredRecords = <T>(storageKey: string, normalize: (value: unknown) => T | null, userId?: string): T[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(storageKey, userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalize).filter((record): record is T => record !== null);
  } catch {
    return [];
  }
};

const writeStoredRecords = <T>(storageKey: string, records: T[], userId?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(storageKey, userId), JSON.stringify(records));
};

const generateId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const buildIncome = (
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Income => {
  const id = overrides.id ?? (readString(payload.id) || generateId('income'));
  const createdAt = overrides.createdAt ?? (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    patientId: readString(payload.patientId, payload.patient_id) || undefined,
    patientName: readString(payload.patientName, payload.patient_name),
    service: readString(payload.service),
    paymentMethod:
      payload.paymentMethod === 'cartao' ||
      payload.paymentMethod === 'dinheiro' ||
      payload.paymentMethod === 'stripe'
        ? payload.paymentMethod
        : 'pix',
    amount: readNumber(0, payload.amount),
    status: normalizeIncomeStatus(payload.status),
    attendanceDate: readString(payload.attendanceDate, payload.attendance_date),
    observations: readString(payload.observations, payload.notes),
    createdAt,
  };
};

const buildExpense = (
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Expense => {
  const id = overrides.id ?? (readString(payload.id) || generateId('expense'));
  const createdAt = overrides.createdAt ?? (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    description: readString(payload.description),
    category: payload.category === 'fixa' ? 'fixa' : 'variavel',
    amount: readNumber(0, payload.amount),
    date: readString(payload.date),
    paymentMethod:
      payload.paymentMethod === 'cartao' ||
      payload.paymentMethod === 'dinheiro' ||
      payload.paymentMethod === 'transferencia' ||
      payload.paymentMethod === 'outro'
        ? payload.paymentMethod
        : 'pix',
    status: normalizeExpenseStatus(payload.status),
    observations: readString(payload.observations, payload.notes),
    createdAt,
  };
};

// ===============================
// PUBLIC: READ (CACHE localStorage)
// ===============================

export function carregarReceitas(userId?: string): Income[] {
  return readStoredRecords(INCOME_STORAGE_KEY, normalizeIncome, userId);
}

export function carregarDespesas(userId?: string): Expense[] {
  return readStoredRecords(EXPENSE_STORAGE_KEY, normalizeExpense, userId);
}

export function salvarReceitas(receitas: Income[], userId?: string): Income[] {
  writeStoredRecords(INCOME_STORAGE_KEY, receitas, userId);
  return receitas;
}

export function salvarDespesas(despesas: Expense[], userId?: string): Expense[] {
  writeStoredRecords(EXPENSE_STORAGE_KEY, despesas, userId);
  return despesas;
}

// ===============================
// PUBLIC: WRITE (localStorage + backend local)
// ===============================

const RELATION_INCOMES = 'incomes';
const RELATION_EXPENSES = 'expenses';

type IncomeDbRow = Income & { user_id?: string; clinic_id?: string };
type ExpenseDbRow = Expense & { user_id?: string; clinic_id?: string };

function getClinicId(userId?: string): string {
  return userId ?? '';
}

export function salvarReceita(receita: Income, userId?: string): Income {
  const receitas = carregarReceitas(userId);
  const nextReceita: Income = {
    ...receita,
    createdAt: receita.createdAt ?? getCurrentTimestamp(),
  };

  const index = receitas.findIndex((storedIncome) => storedIncome.id === nextReceita.id);

  if (index === -1) {
    receitas.push(nextReceita);
  } else {
    receitas[index] = nextReceita;
  }

  // Atualiza cache local
  writeStoredRecords(INCOME_STORAGE_KEY, receitas, userId);

  // Grava no backend local (best-effort)
  void (async () => {
    try {
      const clinicId = getClinicId(userId);
      const payload: IncomeDbRow = { ...(nextReceita as IncomeDbRow), clinic_id: clinicId, user_id: clinicId };
      await localApiCreate<IncomeDbRow>(RELATION_INCOMES, payload as Omit<IncomeDbRow, 'id'> & Partial<Pick<IncomeDbRow, 'id'>>);
    } catch {
      // não quebra fluxo
    }
  })();

  return nextReceita;
}

export function atualizarReceita(id: string, updates: Partial<Income>, userId?: string): Income | null {
  const receitas = carregarReceitas(userId);
  const index = receitas.findIndex((receita) => receita.id === id);

  if (index === -1) {
    return null;
  }

  const updatedIncome: Income = {
    ...receitas[index],
    ...updates,
    patientId: updates.patientId ?? receitas[index].patientId,
    patientName: typeof updates.patientName === 'string' ? updates.patientName : receitas[index].patientName,
    service: typeof updates.service === 'string' ? updates.service : receitas[index].service,
    paymentMethod:
      updates.paymentMethod === 'cartao' ||
      updates.paymentMethod === 'dinheiro' ||
      updates.paymentMethod === 'stripe'
        ? updates.paymentMethod
        : receitas[index].paymentMethod,
    amount:
      typeof updates.amount === 'number' && Number.isFinite(updates.amount) ? updates.amount : receitas[index].amount,
    status:
      updates.status === 'paid' ? 'paid' : updates.status === 'pending' ? 'pending' : receitas[index].status,
    attendanceDate: typeof updates.attendanceDate === 'string' ? updates.attendanceDate : receitas[index].attendanceDate,
    observations:
      typeof updates.observations === 'string' ? updates.observations : receitas[index].observations,
    createdAt: updates.createdAt ?? receitas[index].createdAt,
  };

  receitas[index] = updatedIncome;
  writeStoredRecords(INCOME_STORAGE_KEY, receitas, userId);

  // Grava no backend local (best-effort)
  void (async () => {
    try {
      const clinicId = getClinicId(userId);
      const payload: IncomeDbRow = { ...(updatedIncome as IncomeDbRow), clinic_id: clinicId, user_id: clinicId };
      await localApiUpdate<IncomeDbRow>(RELATION_INCOMES, id, payload as Omit<IncomeDbRow, 'id'> & Partial<Pick<IncomeDbRow, 'id'>>);
    } catch {
      // não quebra fluxo
    }
  })();

  return updatedIncome;
}

export function removerReceita(id: string, userId?: string): boolean {
  const receitas = carregarReceitas(userId);
  const nextReceitas = receitas.filter((receita) => receita.id !== id);

  if (nextReceitas.length === receitas.length) {
    return false;
  }

  writeStoredRecords(INCOME_STORAGE_KEY, nextReceitas, userId);

  void (async () => {
    try {
      await localApiDelete(RELATION_INCOMES, id);
    } catch {
      // ignore
    }
  })();

  return true;
}

export function salvarDespesa(despesa: Expense, userId?: string): Expense {
  const despesas = carregarDespesas(userId);
  const nextDespesa: Expense = {
    ...despesa,
    createdAt: despesa.createdAt ?? getCurrentTimestamp(),
  };

  const index = despesas.findIndex((storedExpense) => storedExpense.id === nextDespesa.id);

  if (index === -1) {
    despesas.push(nextDespesa);
  } else {
    despesas[index] = nextDespesa;
  }

  writeStoredRecords(EXPENSE_STORAGE_KEY, despesas, userId);

  void (async () => {
    try {
      const clinicId = getClinicId(userId);
      const payload: ExpenseDbRow = { ...(nextDespesa as ExpenseDbRow), clinic_id: clinicId, user_id: clinicId };
      await localApiCreate<ExpenseDbRow>(RELATION_EXPENSES, payload as Omit<ExpenseDbRow, 'id'> & Partial<Pick<ExpenseDbRow, 'id'>>);
    } catch {
      // ignore
    }
  })();

  return nextDespesa;
}

export function atualizarDespesa(id: string, updates: Partial<Expense>, userId?: string): Expense | null {
  const despesas = carregarDespesas(userId);
  const index = despesas.findIndex((despesa) => despesa.id === id);

  if (index === -1) {
    return null;
  }

  const updatedExpense: Expense = {
    ...despesas[index],
    ...updates,
    description: typeof updates.description === 'string' ? updates.description : despesas[index].description,
    category:
      updates.category === 'fixa' ? 'fixa' : updates.category === 'variavel' ? 'variavel' : despesas[index].category,
    amount:
      typeof updates.amount === 'number' && Number.isFinite(updates.amount) ? updates.amount : despesas[index].amount,
    date: typeof updates.date === 'string' ? updates.date : despesas[index].date,
    paymentMethod:
      updates.paymentMethod === 'cartao' ||
      updates.paymentMethod === 'dinheiro' ||
      updates.paymentMethod === 'transferencia' ||
      updates.paymentMethod === 'outro'
        ? updates.paymentMethod
        : despesas[index].paymentMethod,
    status: updates.status === 'paid' ? 'paid' : updates.status === 'pending' ? 'pending' : despesas[index].status,
    observations:
      typeof updates.observations === 'string' ? updates.observations : despesas[index].observations,
    createdAt: updates.createdAt ?? despesas[index].createdAt,
  };

  despesas[index] = updatedExpense;
  writeStoredRecords(EXPENSE_STORAGE_KEY, despesas, userId);

  void (async () => {
    try {
      const clinicId = getClinicId(userId);
      const payload: ExpenseDbRow = { ...(updatedExpense as ExpenseDbRow), clinic_id: clinicId, user_id: clinicId };
      await localApiUpdate<ExpenseDbRow>(
        RELATION_EXPENSES,
        id,
        payload as Omit<ExpenseDbRow, 'id'> & Partial<Pick<ExpenseDbRow, 'id'>>,
      );
    } catch {
      // ignore
    }
  })();

  return updatedExpense;
}

export function removerDespesa(id: string, userId?: string): boolean {
  const despesas = carregarDespesas(userId);
  const nextDespesas = despesas.filter((despesa) => despesa.id !== id);

  if (nextDespesas.length === despesas.length) {
    return false;
  }

  writeStoredRecords(EXPENSE_STORAGE_KEY, nextDespesas, userId);

  void (async () => {
    try {
      await localApiDelete(RELATION_EXPENSES, id);
    } catch {
      // ignore
    }
  })();

  return true;
}

// ===============================
// LOCAL BUILDERS (unchanged)
// ===============================

export function criarReceitaLocal(
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Income {
  return buildIncome(payload, overrides);
}

export function criarDespesaLocal(
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Expense {
  return buildExpense(payload, overrides);
}

// ===============================
// Optional helper for AppContext local fetch
// ===============================

export async function listIncomesFromBackend(userId?: string): Promise<Income[]> {
  const clinicId = getClinicId(userId);
  const rows = await localApiList<IncomeDbRow>(RELATION_INCOMES, clinicId ? [{ col: 'user_id', val: clinicId }] : undefined);
  return rows.map((r) => normalizeIncome(r) as Income).filter(Boolean);
}

export async function listExpensesFromBackend(userId?: string): Promise<Expense[]> {
  const clinicId = getClinicId(userId);
  const rows = await localApiList<ExpenseDbRow>(RELATION_EXPENSES, clinicId ? [{ col: 'user_id', val: clinicId }] : undefined);
  return rows.map((r) => normalizeExpense(r) as Expense).filter(Boolean);
}
