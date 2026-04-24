import { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

type Transaction = {
  id: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  transaction_date: string;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  payment_method: string;
  notes: string;
  patient_id?: string | null;
  patient_name?: string | null;
  clinic_id?: string | null;
  created_at: string;
  updated_at: string;
};

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  overdue: { label: 'Atrasado', variant: 'error' },
};

const categoryColors: Record<string, string> = {
  Procedimento: '#14b8a6',
  Insumos: '#f59e0b',
  Infraestrutura: '#3b82f6',
  Tecnologia: '#06b6d4',
  Marketing: '#f97316',
  Outro: '#8b5cf6',
};

const categories = ['Procedimento', 'Insumos', 'Infraestrutura', 'Tecnologia', 'Marketing', 'Outro'];
const paymentMethods = ['Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'PIX', 'Transferência', 'Outro'];

export function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<{
    description: string;
    category: string;
    type: 'income' | 'expense';
    amount: string;
    payment_method: string;
    notes: string;
  }>({
    description: '',
    category: 'Procedimento',
    type: 'income',
    amount: '',
    payment_method: 'PIX',
    notes: '',
  });

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem('financeiro_transactions');
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleAddTransaction = async () => {
    if (!formData.description || !formData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const id = `trans_${Date.now()}`;

    const newTransaction: Transaction = {
      id,
      description: formData.description,
      category: formData.category,
      type: formData.type,
      amount: parseFloat(formData.amount),
      currency: 'BRL',
      transaction_date: today,
      due_date: today,
      paid_date: null,
      status: 'pending',
      payment_method: formData.payment_method,
      notes: formData.notes,
      patient_id: null,
      patient_name: null,
      clinic_id: null,
      created_at: now,
      updated_at: now,
    };

    const updated = [...transactions, newTransaction];
    setTransactions(updated);
    localStorage.setItem('financeiro_transactions', JSON.stringify(updated));

    setFormData({
      description: '',
      category: 'Procedimento',
      type: 'income',
      amount: '',
      payment_method: 'PIX',
      notes: '',
    });
    setShowModal(false);
  };

  const handleMarkAsPaid = (id: string) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const updated = transactions.map((t) =>
      t.id === id ? { ...t, status: 'paid' as const, paid_date: today, updated_at: now } : t
    );
    setTransactions(updated);
    localStorage.setItem('financeiro_transactions', JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return;

    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('financeiro_transactions', JSON.stringify(updated));
  };

  // Calcular totais
  const income = transactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const pending = transactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  const balance = income - expenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Financeiro</h1>
          <p className="text-gray-400 mt-1">Gerencie receitas, despesas e pagamentos</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus size={20} />
          Nova Transação
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Receita Total</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">{fmt(income)}</p>
            </div>
            <ArrowUpRight className="text-emerald-500" size={24} />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Despesa Total</p>
              <p className="text-2xl font-bold text-red-400 mt-2">{fmt(expenses)}</p>
            </div>
            <ArrowDownRight className="text-red-500" size={24} />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Saldo</p>
              <p className={`text-2xl font-bold mt-2 ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {fmt(balance)}
              </p>
            </div>
            <Wallet className="text-blue-500" size={24} />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Pendente</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">{fmt(Math.abs(pending))}</p>
              <p className="text-xs text-gray-500 mt-1">{pending > 0 ? 'A receber' : 'A pagar'}</p>
            </div>
            <TrendingUp className="text-yellow-500" size={24} />
          </div>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Transações Recentes</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-300 gap-2"
          >
            <Download size={16} />
            Exportar
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3 fade-in">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-3">
                <Skeleton className="h-10 col-span-2" />
                <Skeleton className="h-10 col-span-1" />
                <Skeleton className="h-10 col-span-1" />
                <Skeleton className="h-10 col-span-1" />
                <Skeleton className="h-10 col-span-1" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Nenhuma transação registrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Descrição</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((trans) => (
                  <tr key={trans.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-100">{trans.description}</p>
                        <p className="text-xs text-gray-500">{trans.payment_method}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          color: categoryColors[trans.category] || '#8b5cf6',
                          backgroundColor:
                            categoryColors[trans.category] ? `${categoryColors[trans.category]}20` : '#8b5cf620',
                        }}
                      >
                        {trans.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{new Date(trans.transaction_date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4">
                      <span className={trans.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>
                        {trans.type === 'income' ? '+' : '-'} {fmt(trans.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusMap[trans.status]?.variant || 'neutral'}>
                        {statusMap[trans.status]?.label || trans.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {trans.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(trans.id)}
                            className="px-2 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30 transition"
                          >
                            Marcar Pago
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(trans.id)}
                          className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition"
                        >
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal
          title="Nova Transação"
          onClose={() => setShowModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddTransaction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Adicionar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Agulha para consulta"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor (R$) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pagamento</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notas</label>
              <textarea
                placeholder="Adicione observações..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
