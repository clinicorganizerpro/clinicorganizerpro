import { useEffect, useState } from 'react';
import { Loader, Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiHealth, getApiBaseUrl } from '../lib/api';

type Step = 'checking' | 'initializing' | 'completed' | 'error';

export function Setup() {
  const [step, setStep] = useState<Step>('checking');
  const [message, setMessage] = useState('Verificando o backend...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initializeLocalBackend();
  }, []);

  const initializeLocalBackend = async () => {
    try {
      setStep('initializing');
      setMessage('Validando conexão com a API...');

      const healthJson = await apiHealth();

      if (!healthJson?.ok) {
        throw new Error('O backend não retornou uma resposta válida.');
      }

      setMessage('Backend conectado com sucesso!');
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
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Configuração local</h1>
          <p className="text-gray-400 mb-6">{message}</p>

          {error && (
            <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-red-300 text-xs mt-2">
                Certifique-se de que o backend está ativo em <code>{getApiBaseUrl() || '/health'}</code>.
              </p>
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
              onClick={() => void initializeLocalBackend()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Tentar novamente
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
