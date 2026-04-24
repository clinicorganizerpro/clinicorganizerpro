import { useState, useMemo } from 'react';
import { Plus, Download, Trash2, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/useApp';
import { Income, Expense } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────

type TimePeriod = 'day' | 'week' | 'month' | 'year';

// ─── Utilities ────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end: new Date() };
}

function filterByPeriod<T extends { attendanceDate?: string; date?: string }>(
  items: T[],
  period: TimePeriod
): T[] {
  const { start, end } = getDateRange(period);
  return items.filter((item) => {
    const dateStr = item.attendanceDate || item.date || '';
    const date = new Date(dateStr);
    return date >= start && date <= end;
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────

function DashboardStats({ incomes, expenses, period }: { incomes: Income[]; expenses: Expense[]; period: TimePeriod }) {
  const filteredIncomes = filterByPeriod(incomes, period);
  const filteredExpenses = filterByPeriod(expenses, period);

  const totalIncome = filteredIncomes.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = filteredExpenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingIncome = filteredIncomes.filter((i) => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const stats = [
    { label: 'Receitas Recebidas', value: totalIncome, icon: '📈', color: '#10b981', bgColor: 'rgba(16,185,129,0.1)' },
    { label: 'Despesas Pagas', value: totalExpense, icon: '📉', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' },
    { label: 'Lucro Líquido', value: netProfit, icon: '💰', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)' },
    { label: 'A Receber', value: pendingIncome, icon: '⏳', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-5 rounded-2xl border transition-all hover:shadow-lg"
          style={{ background: stat.bgColor, borderColor: `${stat.color}40` }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{stat.icon}</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100 tracking-tight">{fmt(stat.value)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Modais ──────────────────────────────────────────────────────────────

type NewIncomeInput = Omit<Income, 'id' | 'createdAt'>;
type NewExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
type IncomeForm = Omit<NewIncomeInput, 'amount'> & { amount: string };
type ExpenseForm = Omit<NewExpenseInput, 'amount'> & { amount: string };

function IncomeModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (data: NewIncomeInput) => void }) {
  const [form, setForm] = useState<IncomeForm>({
    patientName: '',
    service: '',
    paymentMethod: 'pix',
    amount: '',
    observations: '',
    status: 'pending',
    attendanceDate: new Date().toISOString().split('T')[0],
  });

  const handleSave = () => {
    if (!form.patientName || !form.service || !form.amount) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    onAdd({
      ...form,
      amount: Number(form.amount),
    });
    setForm({ patientName: '', service: '', paymentMethod: 'pix', amount: '', observations: '', status: 'pending', attendanceDate: new Date().toISOString().split('T')[0] });
    onClose();
  };

  return (
    <>
      {open && (
        <Modal
          title="Nova Entrada (Receita)"
          onClose={onClose}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Adicionar</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Paciente *</label>
              <input
                type="text"
                placeholder="Nome do paciente"
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Serviço *</label>
              <input
                type="text"
                placeholder="Ex: Botox, Limpeza de pele"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Forma de Pagamento</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as NewIncomeInput['paymentMethod'] })} className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200">
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Valor *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Observações</label>
              <textarea
                placeholder="Observações opcionais"
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ExpenseModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (data: NewExpenseInput) => void }) {
  const [form, setForm] = useState<ExpenseForm>({
    description: '',
    category: 'variavel',
    paymentMethod: 'pix',
    amount: '',
    observations: '',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSave = () => {
    if (!form.description || !form.amount) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    onAdd({
      ...form,
      amount: Number(form.amount),
    });
    setForm({ description: '', category: 'variavel', paymentMethod: 'pix', amount: '', observations: '', status: 'pending', date: new Date().toISOString().split('T')[0] });
    onClose();
  };

  return (
    <>
      {open && (
        <Modal
          title="Nova Despesa"
          onClose={onClose}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Adicionar</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Produtos"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as NewExpenseInput['category'] })} className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200">
                  <option value="variavel">Variável</option>
                  <option value="fixa">Fixa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Valor *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Forma de Pagamento</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as NewExpenseInput['paymentMethod'] })} className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200">
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Observações</label>
              <textarea
                placeholder="Observações opcionais"
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200"
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function FinanceiroCompleto() {
  const { incomes, expenses, addIncome, addExpense } = useApp();
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [incomeModal, setIncomeModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [typeTab, setTypeTab] = useState<'incomes' | 'expenses'>('incomes');

  const filteredIncomes = useMemo(() => {
    let result = filterByPeriod(incomes, period);
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    return result;
  }, [incomes, period, statusFilter]);

  const filteredExpenses = useMemo(() => {
    let result = filterByPeriod(expenses, period);
    if (statusFilter !== 'all') result = result.filter((e) => e.status === statusFilter);
    return result;
  }, [expenses, period, statusFilter]);

  const handleAddIncome = async (data: Omit<Income, 'id' | 'createdAt'>) => {
    const success = await addIncome(data);
    if (success) setIncomeModal(false);
  };

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    const success = await addExpense(data);
    if (success) setExpenseModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Financeiro</h1>
          <p className="text-zinc-500 mt-1">Controle completo de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<Download size={16} />} variant="secondary" size="sm">Exportar</Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <DashboardStats incomes={incomes} expenses={expenses} period={period} />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50 w-fit">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                period === p ? 'bg-teal-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50 ml-auto">
          {(['all', 'paid', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s === 'all' ? 'Todas' : s === 'paid' ? 'Pago' : 'Pendente'}
            </button>
          ))}
        </div>
      </div>

      {/* Abas - Entradas vs Despesas */}
      <div className="border-b border-zinc-700 flex gap-8">
        <button
          onClick={() => setTypeTab('incomes')}
          className={`pb-3 font-semibold transition-colors ${
            typeTab === 'incomes'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          💰 Entradas ({filteredIncomes.length})
        </button>
        <button
          onClick={() => setTypeTab('expenses')}
          className={`pb-3 font-semibold transition-colors ${
            typeTab === 'expenses'
              ? 'text-red-400 border-b-2 border-red-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          💸 Despesas ({filteredExpenses.length})
        </button>
      </div>

      {/* Entradas */}
      {typeTab === 'incomes' && (
        <div className="space-y-4">
          <Button icon={<Plus size={16} />} onClick={() => setIncomeModal(true)}>
            Nova Entrada
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-xs text-zinc-500 font-semibold uppercase">
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="text-left px-4 py-3">Forma de Pagamento</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncomes.map((income) => (
                  <tr key={income.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3">{income.patientName}</td>
                    <td className="px-4 py-3">{income.service}</td>
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="info">{income.paymentMethod.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">{fmt(income.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={income.status === 'paid' ? 'success' : 'warning'}>
                        {income.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-zinc-200">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-zinc-200">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Despesas */}
      {typeTab === 'expenses' && (
        <div className="space-y-4">
          <Button icon={<Plus size={16} />} onClick={() => setExpenseModal(true)}>
            Nova Despesa
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-xs text-zinc-500 font-semibold uppercase">
                  <th className="text-left px-4 py-3">Descrição</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Forma de Pagamento</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3">{expense.description}</td>
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="neutral">
                        {expense.category === 'fixa' ? 'Fixa' : 'Variável'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="info">{expense.paymentMethod.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-400">{fmt(expense.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={expense.status === 'paid' ? 'success' : 'warning'}>
                        {expense.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-zinc-200">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-zinc-200">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      <IncomeModal open={incomeModal} onClose={() => setIncomeModal(false)} onAdd={handleAddIncome} />
      <ExpenseModal open={expenseModal} onClose={() => setExpenseModal(false)} onAdd={handleAddExpense} />
    </div>
  );
}
