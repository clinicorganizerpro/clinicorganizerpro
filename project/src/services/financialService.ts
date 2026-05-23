import { createSupabaseCrud } from '@/services/supabaseCrudService';
import type { Expense, Income } from '@/types';

const incomesCrud = createSupabaseCrud<Income>('incomes');
const expensesCrud = createSupabaseCrud<Expense>('expenses');

export const listIncomes = () => incomesCrud.list();
export const createIncome = (data: Partial<Income>) => incomesCrud.create(data);
export const updateIncome = (id: string, data: Partial<Income>) => incomesCrud.update(id, data);
export const removeIncome = (id: string) => incomesCrud.remove(id);

export const listExpenses = () => expensesCrud.list();
export const createExpense = (data: Partial<Expense>) => expensesCrud.create(data);
export const updateExpense = (id: string, data: Partial<Expense>) => expensesCrud.update(id, data);
export const removeExpense = (id: string) => expensesCrud.remove(id);
