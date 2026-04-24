import { useState, useEffect } from 'react';
import { Loader, Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { executeQuery, executeUpdate } from '../lib/db';

type Step = 'checking' | 'initializing' | 'completed' | 'error';

export function Setup() {
  const [step, setStep] = useState<Step>('checking');
  const [message, setMessage] = useState('Verificando conexão com banco de dados...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Test connection
      const { error: testError } = await executeQuery(
        'SELECT COUNT(*) as count FROM users'
      );

      if (testError) {
        throw new Error('Falha ao conectar ao banco de dados. Verifique as variáveis de ambiente.');
      }

      setMessage('Banco de dados conectado com sucesso!');
      setMessage('Inicializando transações...');
      setStep('initializing');

      // Clear old transactions
      await executeUpdate('DELETE FROM transactions WHERE patient_id IS NULL', []);

      // Initialize with sample data
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      const sampleTransactions = [
        {
          id: `trans_${Date.now()}_1`,
          description: 'Agulha estéril 30G',
          category: 'Insumos',
          type: 'expense',
          amount: 45.50,
        },
        {
          id: `trans_${Date.now()}_2`,
          description: 'Serviço de preenchimento',
          category: 'Procedimento',
          type: 'income',
          amount: 800.00,
        },
        {
          id: `trans_${Date.now()}_3`,
          description: 'Botox 10 unidades',
          category: 'Procedimento',
          type: 'income',
          amount: 1200.00,
        },
        {
          id: `trans_${Date.now()}_4`,
          description: 'Internet alta velocidade',
          category: 'Infraestrutura',
          type: 'expense',
          amount: 199.90,
        },
      ];

      for (const trans of sampleTransactions) {
        await executeUpdate(
          `INSERT INTO transactions
           (id, description, category, type, amount, currency, transaction_date, due_date,
            status, payment_method, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            trans.id,
            trans.description,
            trans.category,
            trans.type,
            trans.amount,
            'BRL',
            today,
            today,
            'paid',
            'PIX',
            'Transação inicial de exemplo',
            now,
            now,
          ]
        );
      }

      setMessage('✅ Banco de dados inicializado com sucesso!');
      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStep('error');
    }
  };

  const getIcon = () => {
    switch (step) {
      case 'checking':
      case 'initializing':
        return <Loader className="animate-spin text-emerald-500" size={24} />;
      case 'completed':
        return <Check className="text-emerald-500" size={24} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={24} />;
    }
  };

  return (
    <div className="min-h-screen h-auto bg-gray-950 flex items-start justify-start px-4 pt-8">
      <Card className="w-full max-w-md border-gray-700">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{getIcon()}</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Configuração do Banco</h1>
          <p className="text-gray-400 mb-6">{message}</p>

          {error && (
            <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-red-300 text-xs mt-2">
                Certifique-se de que as variáveis de ambiente estão configuradas em <code>.env</code>:
              </p>
              <code className="text-red-300 text-xs mt-2 block">
                VITE_TURSO_CONNECTION_URL<br />
                VITE_TURSO_AUTH_TOKEN
              </code>
            </div>
          )}

          {step === 'completed' && (
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Continuar
            </Button>
          )}

          {step === 'error' && (
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Tentar Novamente
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
