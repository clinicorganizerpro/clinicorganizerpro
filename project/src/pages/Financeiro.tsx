import { useState, type ReactNode } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  MoreHorizontal,
  Wallet,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { mockTransactions } from '../data/mockData';
import type { Transaction } from '../types';

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'teal' }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  overdue: { label: 'Atrasado', variant: 'error' },
};

const categoryColors: Record<string, { color: string; bg: string }> = {
  Procedimento: { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
  Insumos: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Infraestrutura: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  Tecnologia: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  Marketing: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
};

const monthLabels = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildMonthlyData(items: Transaction[]) {
  return monthLabels.map((month) => {
    const monthIndex = monthNames.indexOf(month);
    const monthTransactions = items.filter((transaction) => new Date(`${transaction.date}T00:00:00`).getMonth() === monthIndex);
    return {
      month,
      income: monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });
}

const categories = ['Procedimento', 'Insumos', 'Infraestrutura', 'Tecnologia', 'Marketing', 'Outro'];
const paymentMethods = ['Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'PIX', 'Transferência', 'Outro'];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function formatExportDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportDocument(title: string, summary: { income: number; expense: number; netProfit: number; pending: number }, rows: Transaction[]) {
  const rowsHtml = rows
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.description)}</td>
          <td>${escapeHtml(transaction.category)}</td>
          <td>${escapeHtml(formatExportDate(transaction.date))}</td>
          <td>${escapeHtml(transaction.type === 'income' ? '+' : '-')}${fmt(transaction.amount)}</td>
          <td>${escapeHtml(statusMap[transaction.status].label)}</td>
          <td>${escapeHtml(transaction.patient || '-')}</td>
        </tr>`,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 24px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .subtitle { margin: 0 0 20px; color: #6b7280; }
          .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
          .summary-item { border: 1px solid #d1d5db; border-radius: 12px; padding: 12px; background: #f9fafb; }
          .summary-item span { display: block; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
          .summary-item strong { font-size: 18px; color: #111827; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">Exportado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
        <div class="summary">
          <div class="summary-item"><span>Receitas</span><strong>${escapeHtml(fmt(summary.income))}</strong></div>
          <div class="summary-item"><span>Despesas</span><strong>${escapeHtml(fmt(summary.expense))}</strong></div>
          <div class="summary-item"><span>Lucro líquido</span><strong>${escapeHtml(fmt(summary.netProfit))}</strong></div>
          <div class="summary-item"><span>A receber</span><strong>${escapeHtml(fmt(summary.pending))}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Paciente</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6">Nenhuma transação encontrada</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function BarChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <div className="flex items-end gap-3 h-40 mt-2">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const incomeH = (d.income / maxVal) * 100;
        const expenseH = (d.expense / maxVal) * 100;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="flex items-end gap-0.5 h-32 w-full">
              <div className="flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-90"
                  style={{
                    height: `${incomeH}%`,
                    background: isLast
                      ? 'linear-gradient(180deg, #14b8a6, #0d9488)'
                      : 'rgba(20,184,166,0.25)',
                    boxShadow: isLast ? '0 0 12px rgba(20,184,166,0.3)' : 'none',
                    minHeight: '0px',
                  }}
                />
              </div>
              <div className="flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-90"
                  style={{
                    height: `${expenseH}%`,
                    background: isLast
                      ? 'linear-gradient(180deg, #f43f5e, #e11d48)'
                      : 'rgba(244,63,94,0.2)',
                    boxShadow: isLast ? '0 0 12px rgba(244,63,94,0.2)' : 'none',
                    minHeight: '0px',
                  }}
                />
              </div>
            </div>
            <span
              className="text-xs font-medium tracking-tight"
              style={{ color: isLast ? '#d4d4d8' : '#52525b' }}
            >
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({
  label, value, change, positive, sparkData, color, icon, sub,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  sparkData: number[];
  color: string;
  icon: ReactNode;
  sub?: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden transition-all duration-200 hover:scale-[1.015]"
      style={{
        background: 'linear-gradient(135deg, rgba(22,22,27,0.92) 0%, rgba(14,14,17,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.055)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(ellipse at 90% 10%, ${color}22 0%, transparent 60%)`,
        }}
      />
      <div className="flex items-center justify-between relative">
        <div
          className="p-2 rounded-xl"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          {icon}
        </div>
        <SparkLine data={sparkData} color={color} />
      </div>
      <div className="relative">
        <p className="text-2xl font-bold text-zinc-50 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1 font-medium">{sub}</p>}
      </div>
      <div className="flex items-center justify-between relative">
        <p className="text-xs text-zinc-500 font-medium">{label}</p>
        <span
          className="flex items-center gap-0.5 text-xs font-bold"
          style={{ color: positive ? '#34d399' : '#fb7185' }}
        >
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {change}
        </span>
      </div>
    </div>
  );
}

function DonutChart({ income, expense }: { income: number; expense: number }) {
  const total = income + expense;
  const safeTotal = total || 1;
  const r = 42;
  const cx = 54;
  const cy = 54;
  const circumference = 2 * Math.PI * r;
  const incomeDash = (income / safeTotal) * circumference;
  const expenseDash = (expense / safeTotal) * circumference;

  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(244,63,94,0.7)"
        strokeWidth="10"
        strokeDasharray={`${expenseDash} ${circumference}`}
        strokeDashoffset="0"
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="10"
        strokeDasharray={`${incomeDash} ${circumference}`}
        strokeDashoffset={-expenseDash}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(20,184,166,0.5))' }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#f4f4f5" fontSize="12" fontWeight="700">
        {Math.round((income / safeTotal) * 100)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#71717a" fontSize="8">
        receita
      </text>
    </svg>
  );
}

export function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => [...mockTransactions]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
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

  const filtered = transactions.filter((t) => typeFilter === 'all' || t.type === typeFilter);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const pendingAmount = transactions.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  const monthlyData = buildMonthlyData(transactions);

  const categoryTotals = categories.reduce<Record<string, number>>((acc, category) => {
    acc[category] = transactions
      .filter((transaction) => transaction.category === category)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return acc;
  }, {});

  const maxCatVal = Math.max(...Object.values(categoryTotals), 1);

  const incomeSparkData = monthlyData.map((month) => month.income);
  const expenseSparkData = monthlyData.map((month) => month.expense);
  const profitSparkData = monthlyData.map((month) => month.income - month.expense);

  const handleOpenTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleRequestDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = () => {
    if (!transactionToDelete) return;
    setTransactions((current) => current.filter((transaction) => transaction.id !== transactionToDelete.id));
    setSelectedTransaction((current) => (current?.id === transactionToDelete.id ? null : current));
    setTransactionToDelete(null);
  };

  const handleAddTransaction = () => {
    if (!formData.description.trim() || !formData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const amountValue = Number(formData.amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      alert('Informe um valor válido');
      return;
    }

    const newTransaction: Transaction = {
      id: String(Date.now()),
      description: formData.description.trim(),
      category: formData.category,
      type: formData.type,
      amount: amountValue,
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
    };

    setTransactions((current) => [newTransaction, ...current]);
    setFormData({
      description: '',
      category: 'Procedimento',
      type: 'income',
      amount: '',
      payment_method: 'PIX',
      notes: '',
    });
    setShowModal(false);
    setSelectedTransaction(newTransaction);
    alert('Transação adicionada com sucesso!');
  };

  const handleExport = (format: 'excel' | 'word') => {
    const title = 'Relatório Financeiro';
    const exportRows = filtered;
    const summary = {
      income: totalIncome,
      expense: totalExpense,
      netProfit,
      pending: pendingAmount,
    };

    const html = buildExportDocument(title, summary, exportRows);

    if (format === 'excel') {
      downloadFile(`financeiro-${new Date().toISOString().slice(0, 10)}.xls`, html, 'application/vnd.ms-excel');
      return;
    }

    downloadFile(`financeiro-${new Date().toISOString().slice(0, 10)}.doc`, html, 'application/msword');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50 tracking-tight">Financeiro</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Abril 2024 — visão completa</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Download size={14} />}
            size="sm"
            onClick={() => handleExport('excel')}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            icon={<Download size={14} />}
            size="sm"
            onClick={() => handleExport('word')}
          >
            Word
          </Button>
          <Button icon={<Plus size={15} />} size="sm" onClick={() => setShowModal(true)}>Nova Transação</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Receitas em Abril"
          value={fmt(totalIncome)}
          change="+0.0%"
          positive={true}
          sparkData={incomeSparkData}
          color="#14b8a6"
          icon={<ArrowUpRight size={15} className="text-teal-400" />}
          sub="vs. R$ 0,00 em março"
        />
        <MetricCard
          label="Despesas em Abril"
          value={fmt(totalExpense)}
          change="+0.0%"
          positive={false}
          sparkData={expenseSparkData}
          color="#f43f5e"
          icon={<ArrowDownRight size={15} className="text-red-400" />}
          sub="vs. R$ 0,00 em março"
        />
          <MetricCard
            label="Lucro líquido"
            value={fmt(netProfit)}
            change={`${profitMargin}% margem`}
            positive={netProfit >= 0}
            sparkData={profitSparkData}
            color="#10b981"
            icon={<TrendingUp size={15} className="text-emerald-400" />}
            sub={`Margem de ${profitMargin}%`}
          />
        <MetricCard
          label="A receber"
          value={fmt(pendingAmount)}
          change="0 pendentes"
          positive={false}
          sparkData={[0, 0, 0, 0, 0, 0]}
          color="#f59e0b"
          icon={<Wallet size={15} className="text-amber-400" />}
          sub="Aguardando confirmação"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(22,22,27,0.92) 0%, rgba(14,14,17,0.96) 100%)',
              border: '1px solid rgba(255,255,255,0.055)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-zinc-200 tracking-tight">Receitas vs Despesas</h3>
                <p className="text-xs text-zinc-600 mt-0.5">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400" style={{ boxShadow: '0 0 5px rgba(20,184,166,0.6)' }} />
                  <span className="text-xs text-zinc-500 font-medium">Receitas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs text-zinc-500 font-medium">Despesas</span>
                </div>
              </div>
            </div>
            <BarChart data={monthlyData} />
          </div>

          <div
            className="flex items-center gap-1 rounded-xl p-1 w-fit"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150"
                style={{
                  background: typeFilter === t ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'transparent',
                  color: typeFilter === t ? '#022c22' : '#71717a',
                  boxShadow: typeFilter === t ? '0 2px 8px rgba(20,184,166,0.3)' : 'none',
                }}
              >
                {t === 'all' ? 'Todas' : t === 'income' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>

          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(22,22,27,0.92) 0%, rgba(14,14,17,0.96) 100%)',
              border: '1px solid rgba(255,255,255,0.055)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th className="text-left text-xs font-semibold text-zinc-600 px-5 py-3.5 tracking-wide">Descrição</th>
                    <th className="text-left text-xs font-semibold text-zinc-600 px-4 py-3.5 tracking-wide hidden md:table-cell">Categoria</th>
                    <th className="text-left text-xs font-semibold text-zinc-600 px-4 py-3.5 tracking-wide hidden sm:table-cell">Data</th>
                    <th className="text-right text-xs font-semibold text-zinc-600 px-4 py-3.5 tracking-wide">Valor</th>
                    <th className="text-left text-xs font-semibold text-zinc-600 px-4 py-3.5 tracking-wide">Status</th>
                    <th className="px-4 py-3.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr
                      key={t.id}
                      className="transition-all duration-150"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: hoveredRow === t.id ? 'rgba(255,255,255,0.025)' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredRow(t.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: t.type === 'income'
                                ? 'rgba(20,184,166,0.1)'
                                : 'rgba(244,63,94,0.1)',
                              border: `1px solid ${t.type === 'income' ? 'rgba(20,184,166,0.15)' : 'rgba(244,63,94,0.15)'}`,
                            }}
                          >
                            {t.type === 'income'
                              ? <ArrowUpRight size={13} className="text-teal-400" />
                              : <ArrowDownRight size={13} className="text-red-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-200 tracking-tight">{t.description}</p>
                            {t.patient && <p className="text-xs text-zinc-600 mt-0.5">{t.patient}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: categoryColors[t.category]?.color || '#71717a' }}
                          />
                          <span className="text-xs text-zinc-400 font-medium">{t.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs text-zinc-500 font-medium">{t.date}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className="text-sm font-bold tracking-tight"
                          style={{ color: t.type === 'income' ? '#34d399' : '#fb7185' }}
                        >
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusMap[t.status].variant} dot>{statusMap[t.status].label}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          aria-label="Ver detalhes da transação"
                          title="Ver detalhes"
                          className="text-zinc-700 hover:text-zinc-400 transition-colors p-1 rounded-lg hover:bg-white/5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTransaction(t);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(22,22,27,0.92) 0%, rgba(14,14,17,0.96) 100%)',
              border: '1px solid rgba(255,255,255,0.055)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <h3 className="text-base font-bold text-zinc-200 tracking-tight mb-4">Distribuição</h3>
            <div className="flex items-center gap-5">
              <DonutChart income={totalIncome} expense={totalExpense} />
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Receitas', value: fmt(totalIncome), color: '#14b8a6', pct: Math.round((totalIncome / (totalIncome + totalExpense || 1)) * 100) },
                  { label: 'Despesas', value: fmt(totalExpense), color: '#f43f5e', pct: Math.round((totalExpense / (totalIncome + totalExpense || 1)) * 100) },
                  { label: 'Lucro', value: fmt(netProfit), color: '#10b981', pct: profitMargin },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-zinc-500 font-medium">{item.label}</span>
                      <span className="text-xs font-bold" style={{ color: item.color }}>{item.pct}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.pct}%`, background: item.color, boxShadow: `0 0 6px ${item.color}60` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Card>
            <h3 className="text-base font-bold text-zinc-200 tracking-tight mb-4">Por Categoria</h3>
            <div className="space-y-3.5">
              {Object.entries(categoryTotals).map(([cat, val]) => {
                const cc = categoryColors[cat] || { color: '#71717a', bg: 'rgba(113,113,122,0.1)' };
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: cc.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cc.color, display: 'block' }} />
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">{cat}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{fmt(val)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(val / maxCatVal) * 100}%`,
                          background: `linear-gradient(90deg, ${cc.color}, ${cc.color}80)`,
                          boxShadow: `0 0 4px ${cc.color}50`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-5 pt-4 space-y-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Mês Anterior</h4>
                <button className="text-zinc-700 hover:text-zinc-400 transition-colors">
                  <ChevronRight size={12} />
                </button>
              </div>
              {[
                { label: 'Receitas', value: fmt(0), color: '#34d399' },
                { label: 'Despesas', value: fmt(0), color: '#fb7185' },
                { label: 'Lucro', value: fmt(0), color: '#a3a3a3' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-zinc-600">{label}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{value}</span>
                </div>
              ))}
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-xs text-zinc-600">Crescimento</span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <TrendingUp size={10} />
                  +0.0%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showModal && (
        <Modal
          title="Nova Transação"
          onClose={() => setShowModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddTransaction}>
                Adicionar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Consulta dermatológica"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                  className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} style={{ background: '#0d0e14' }}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Método de Pagamento</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 outline-none appearance-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method} style={{ background: '#0d0e14' }}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Observações</label>
              <textarea
                placeholder="Adicione observações..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {selectedTransaction && (
        <Modal
          title="Detalhes da transação"
          subtitle={selectedTransaction.description}
          onClose={() => setSelectedTransaction(null)}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>
                Fechar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRequestDelete(selectedTransaction)}
              >
                Excluir {selectedTransaction.type === 'income' ? 'entrada' : 'despesa'}
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Valor</p>
                <p
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: selectedTransaction.type === 'income' ? '#34d399' : '#fb7185' }}
                >
                  {selectedTransaction.type === 'income' ? '+' : '-'}{fmt(selectedTransaction.amount)}
                </p>
              </div>

              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Tipo</span>
                  <Badge variant={selectedTransaction.type === 'income' ? 'success' : 'error'} dot>
                    {selectedTransaction.type === 'income' ? 'Entrada' : 'Saída'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  <Badge variant={statusMap[selectedTransaction.status].variant} dot>
                    {statusMap[selectedTransaction.status].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Categoria</span>
                  <span className="text-xs font-semibold text-zinc-300">{selectedTransaction.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Data</span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {new Date(`${selectedTransaction.date}T00:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Descrição</p>
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">{selectedTransaction.description}</p>
              </div>

              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Paciente</p>
                <p className="text-sm text-zinc-300">
                  {selectedTransaction.patient || 'Sem paciente vinculado'}
                </p>
              </div>

              <div
                className="rounded-2xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">ID</p>
                <p className="text-sm text-zinc-300 font-mono">{selectedTransaction.id}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title={`Excluir ${transactionToDelete?.type === 'income' ? 'entrada' : 'despesa'}`}
        description={`Tem certeza que deseja excluir "${transactionToDelete?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
