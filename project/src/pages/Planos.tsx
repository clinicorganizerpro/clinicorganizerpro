import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useApp } from '../context/useApp';
import { useSubscription } from '../hooks/useSubscription';

type PlanRecord = {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  active: boolean;
};

type PlanosAppContext = ReturnType<typeof useApp> & {
  adminData?: { plans?: PlanRecord[] };
  currentPlan?: PlanRecord | null;
  theme?: 'light' | 'dark';
};

const defaultPlanFeatures: Record<string, string[]> = {
  essencial: ['Agenda básica', 'Pacientes', 'Anamnese', '1 usuário'],
  pro: ['Financeiro', 'Estoque', 'Relatórios', 'Até 5 usuários'],
  clinic: ['Multi unidade', 'Usuários ilimitados', 'Automações', 'Analytics avançado'],
};

const normalizePlanKey = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.includes('clinic') || normalized.includes('clinica')) return 'clinic';
  if (normalized.includes('pro') || normalized.includes('profissional')) return 'pro';
  return 'essencial';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function Planos() {
  const app = useApp() as PlanosAppContext;
  const { subscription, loading, error, startCheckout, openBillingPortal } = useSubscription();
  const plans = (app.adminData?.plans ?? []).filter((plan) => plan.active);
  const currentPlanId = subscription?.planId ?? app.currentPlan?.id ?? '';
  const theme = app.theme ?? 'dark';
  const text = theme === 'light' ? 'text-slate-900' : 'text-zinc-100';
  const muted = theme === 'light' ? 'text-slate-600' : 'text-zinc-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="teal">Assinatura Stripe</Badge>
          <h1 className={`mt-3 text-3xl font-bold ${text}`}>Planos</h1>
          <p className={`mt-2 max-w-2xl text-sm ${muted}`}>
            Escolha o plano recorrente da clínica e gerencie a cobrança pelo Stripe Checkout.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<CreditCard className="h-4 w-4" />}
          disabled={!subscription?.stripeCustomerId}
          onClick={() => void openBillingPortal()}
        >
          Portal de cobrança
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const key = normalizePlanKey(`${plan.id} ${plan.name}`);
          const features = defaultPlanFeatures[key] ?? plan.features;
          const isCurrent = currentPlanId === plan.id;

          return (
            <Card key={plan.id} accent={isCurrent} className="flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-bold ${text}`}>{plan.name}</h2>
                  <p className={`mt-2 text-sm ${muted}`}>{plan.description}</p>
                </div>
                {isCurrent ? <Badge variant="success">Atual</Badge> : null}
              </div>

              <div>
                <span className={`text-3xl font-bold ${text}`}>{formatCurrency(plan.monthlyPrice)}</span>
                <span className={`ml-1 text-sm ${muted}`}>/mês</span>
              </div>

              <div className="space-y-3">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-2">
                <Button
                  className="w-full justify-center"
                  icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  disabled={loading || isCurrent}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {isCurrent ? 'Plano ativo' : 'Assinar plano'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
