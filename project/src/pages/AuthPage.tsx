import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  Wallet,
  MapPin,
} from 'lucide-react';
import logo from '../assets/clinic-organizer-pro-logo.svg';
import { Button } from '../components/ui/Button';

type AuthActions = {
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    clinicId?: string;
    clinicName: string;
    phone: string;
    cnpj: string;
    cep: string;
    address: string;
    addressNumber: string;
    city: string;
    state: string;
  }) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
};

type AuthPageMode = 'signIn' | 'signUp';

type AuthPageProps = AuthActions & {
  mode?: AuthPageMode;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  clinicId: string;
  clinicName: string;
  phone: string;
  cnpj: string;
  cep: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ZipCodeLookupStatus = 'idle' | 'loading' | 'error';

const onlyDigits = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);

const formatPhone = (value: string) => {
  const digits = onlyDigits(value, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCnpj = (value: string) => {
  const digits = onlyDigits(value, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatCep = (value: string) => {
  const digits = onlyDigits(value, 8);

  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
        active
          ? 'border-brand-400 bg-brand-500 text-white shadow-[0_12px_28px_rgba(20,184,166,0.18)]'
          : 'border-white/10 bg-white/3 text-zinc-300 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  placeholder,
  type = 'text',
  autoComplete,
  value,
  onChange,
  disabled,
  icon,
  maxLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-200">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={[
            'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-black outline-none transition',
            'placeholder:text-zinc-500 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20',
            icon ? 'pl-11' : '',
          ].join(' ')}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export default function AuthPage({ signIn, signUp, mode }: AuthPageProps) {
  const [authMode, setAuthMode] = useState<AuthPageMode>(mode ?? 'signUp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zipCodeLookupStatus, setZipCodeLookupStatus] = useState<ZipCodeLookupStatus>('idle');
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    clinicId: '',
    clinicName: '',
    phone: '',
    cnpj: '',
    cep: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (mode) {
      setAuthMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [authMode]);

  useEffect(() => {
    const zipCode = form.cep.replace(/\D/g, '');
    if (zipCode.length < 8) {
      setZipCodeLookupStatus('idle');
      return;
    }

    const controller = new AbortController();
    setZipCodeLookupStatus('loading');

    fetch(`https://viacep.com.br/ws/${zipCode}/json/`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('CEP não encontrado.');
        return response.json() as Promise<{
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        }>;
      })
      .then(data => {
        if (data.erro) throw new Error('CEP não encontrado.');
        setForm(current => {
          if (current.cep.replace(/\D/g, '') !== zipCode) return current;
          return {
            ...current,
            address: data.logradouro ?? '',
            neighborhood: data.bairro ?? '',
            city: data.localidade ?? '',
            state: data.uf ?? '',
          };
        });
        setZipCodeLookupStatus('idle');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setZipCodeLookupStatus('error');
      });

    return () => controller.abort();
  }, [form.cep]);

  const modeHint = useMemo(
    () =>
      authMode === 'signIn'
        ? 'Use seu e-mail e senha para acessar a conta.'
        : 'Preencha os dados abaixo para criar o primeiro acesso.',
    [authMode],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedEmail = form.email.trim();
    const submittedPassword = form.password.trim();

    if (!submittedEmail || !submittedPassword) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === 'signUp') {
        const submittedFullName = form.fullName.trim();
        const submittedClinicName = form.clinicName.trim();
        const submittedPhone = form.phone.trim();
        const submittedCnpj = form.cnpj.trim();
        const submittedCep = form.cep.trim();
        const submittedAddress = form.address.trim();
        const submittedAddressNumber = form.addressNumber.trim();
        const submittedCity = form.city.trim();
        const submittedState = form.state.trim();

        if (!submittedFullName) {
          setError('Informe seu nome completo.');
          return;
        }

        if (!submittedClinicName) {
          setError('Informe o nome da sua clínica ou consultório.');
          return;
        }

        const phoneDigits = submittedPhone.replace(/\D/g, '');
        if (!phoneDigits) {
          setError('Informe o telefone da clínica.');
          return;
        }

        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          setError('Telefone deve ter 10 ou 11 números.');
          return;
        }

        const cepDigits = submittedCep.replace(/\D/g, '');
        if (cepDigits.length !== 8) {
          setError('Informe um CEP válido com 8 números.');
          return;
        }

        const cnpjDigits = submittedCnpj.replace(/\D/g, '');
        if (submittedCnpj && cnpjDigits.length !== 14) {
          setError('CNPJ deve ter exatamente 14 números.');
          return;
        }

        if (!submittedAddress) {
          setError('Informe a rua/avenida da clínica.');
          return;
        }

        if (!submittedAddressNumber) {
          setError('Informe o número do endereço.');
          return;
        }

        if (!submittedCity || !submittedState) {
          setError('Informe cidade e estado.');
          return;
        }

        const result = await signUp({
          name: submittedFullName,
          email: submittedEmail,
          password: submittedPassword,
          clinicId: form.clinicId || undefined,
          clinicName: submittedClinicName,
          phone: submittedPhone,
          cnpj: submittedCnpj,
          cep: submittedCep,
          address: submittedAddress,
          addressNumber: submittedAddressNumber,
          city: submittedCity,
          state: submittedState,
        });

        if (!result.ok) {
          setError(result.error ?? 'Não foi possível criar sua conta. Tente novamente.');
          return;
        }

        setSuccess(
          result.needsConfirmation
            ? 'Conta criada. Verifique seu e-mail para confirmar o acesso.'
            : 'Conta criada com sucesso. Você já pode entrar no sistema.',
        );
        return;
      }

      const result = await signIn(submittedEmail, submittedPassword);

      if (!result.ok) {
        setError(result.error ?? 'Não foi possível entrar. Tente novamente.');
        return;
      }

      setSuccess('Login realizado com sucesso.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06070a] text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true">
        <div className="absolute left-1/2 top-[-180px] h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute left-[-120px] top-[40px] h-[360px] w-[360px] rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute right-[-120px] top-[40px] h-[360px] w-[360px] rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[500px]">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/4 shadow-[0_0_22px_rgba(20,184,166,0.14)]">
              <img src={logo} alt="Clinic Organizer Pro" className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-zinc-50">
                Clinic Organizer Pro
              </p>
              <p className="mt-1 text-xs text-zinc-500">Gestão premium para clínicas</p>
            </div>
          </div>

          <div className="card-premium layer-surface layer-elevated rounded-[2rem] p-4 shadow-[0_24px_100px_rgba(0,0,0,0.42)]">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/3 p-5 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
                    Acesso seguro
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-50 md:text-3xl">
                    {authMode === 'signIn' ? 'Entrar' : 'Criar conta'}
                  </h2>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-2 text-xs font-semibold text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]" />
                  {modeHint}
                </div>
              </div>

              <div className="mt-6 flex gap-2 rounded-3xl border border-white/8 bg-black/20 p-2">
                <ModeButton active={authMode === 'signUp'} onClick={() => setAuthMode('signUp')}>
                  Criar conta
                </ModeButton>
                <ModeButton active={authMode === 'signIn'} onClick={() => setAuthMode('signIn')}>
                  Entrar
                </ModeButton>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {authMode === 'signUp' ? (
                  <Field
                    id="fullName"
                    label="Nome completo"
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(value) => setForm((current) => ({ ...current, fullName: value }))}
                    disabled={isSubmitting}
                  />
                ) : null}

                <Field
                  id="email"
                  label="E-mail"
                  placeholder="voce@exemplo.com"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                  disabled={isSubmitting}
                  icon={<Users className="h-4 w-4" />}
                />

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-zinc-200">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
                      className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-black outline-none transition placeholder:text-zinc-500 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                      aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {authMode === 'signUp' ? (
                  <Field
                    id="clinicName"
                    label="Nome da clínica"
                    placeholder="Nome da sua clínica ou consultório"
                    autoComplete="organization"
                    value={form.clinicName}
                    onChange={(value) => setForm((current) => ({ ...current, clinicName: value }))}
                    disabled={isSubmitting}
                    icon={<Wallet className="h-4 w-4" />}
                  />
                ) : null}

{authMode === 'signUp' ? (
                   <Field
                     id="phone"
                     label="Telefone"
                     placeholder="(11) 99999-9999"
                     autoComplete="tel"
                     value={form.phone}
                     onChange={(value) => setForm((current) => ({ ...current, phone: formatPhone(value) }))}
                     disabled={isSubmitting}
                     maxLength={15}
                   />
                 ) : null}

                 {authMode === 'signUp' ? (
                   <Field
                     id="cnpj"
                     label="CNPJ (opcional)"
                     placeholder="00.000.000/0000-00"
                     value={form.cnpj}
                     onChange={(value) => setForm((current) => ({ ...current, cnpj: formatCnpj(value) }))}
                     disabled={isSubmitting}
                     maxLength={18}
                   />
                 ) : null}

                 {authMode === 'signUp' ? (
                   <div className="space-y-2">
                     <Field
                       id="cep"
                       label="CEP"
                       placeholder="00000-000"
                       value={form.cep}
                       onChange={(value) => setForm((current) => ({ ...current, cep: formatCep(value) }))}
                       disabled={isSubmitting}
                       maxLength={9}
                     />
                     {zipCodeLookupStatus === 'loading' && (
                       <p className="text-xs text-zinc-400">Buscando endereço...</p>
                     )}
                     {zipCodeLookupStatus === 'error' && (
                       <p className="text-xs text-red-400">CEP não encontrado.</p>
                     )}
                   </div>
                 ) : null}

                 {authMode === 'signUp' ? (
                   <Field
                     id="address"
                     label="Rua / Avenida"
                     placeholder="Rua, avenida ou logradouro"
                     autoComplete="address-line1"
                     value={form.address}
                     onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                     disabled={isSubmitting || zipCodeLookupStatus === 'loading'}
                     icon={<MapPin className="h-4 w-4" />}
                   />
                 ) : null}

                 {authMode === 'signUp' ? (
                   <div className="grid gap-4 md:grid-cols-2">
                     <Field
                       id="addressNumber"
                       label="Número"
                       placeholder="123"
                       autoComplete="address-line2"
                       value={form.addressNumber}
                       onChange={(value) => setForm((current) => ({ ...current, addressNumber: value.slice(0, 12) }))}
                       disabled={isSubmitting}
                       maxLength={12}
                     />
                     <Field
                       id="neighborhood"
                       label="Bairro"
                       placeholder="Bairro"
                       value={form.neighborhood}
                       onChange={(value) => setForm((current) => ({ ...current, neighborhood: value }))}
                       disabled={isSubmitting || zipCodeLookupStatus === 'loading'}
                     />
                   </div>
                 ) : null}

                 {authMode === 'signUp' ? (
                   <div className="grid gap-4 md:grid-cols-[1fr_96px]">
                     <Field
                       id="city"
                       label="Cidade"
                       placeholder="Cidade"
                       autoComplete="address-level2"
                       value={form.city}
                       onChange={(value) => setForm((current) => ({ ...current, city: value }))}
                       disabled={isSubmitting || zipCodeLookupStatus === 'loading'}
                     />
                     <Field
                       id="state"
                       label="Estado"
                       placeholder="UF"
                       autoComplete="address-level1"
                       value={form.state}
                       onChange={(value) => setForm((current) => ({ ...current, state: value.toUpperCase().slice(0, 2) }))}
                       disabled={isSubmitting || zipCodeLookupStatus === 'loading'}
                       maxLength={2}
                     />
                   </div>
                 ) : null}

                 {error ? (
                   <div
                     className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                     aria-live="polite"
                   >
                     {error}
                   </div>
                 ) : null}

                 {success ? (
                   <div
                     className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
                     aria-live="polite"
                   >
                     {success}
                   </div>
                 ) : null}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full btn-primary-premium justify-center"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    icon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
                  >
                    {authMode === 'signIn' ? 'Entrar no sistema' : 'Criar conta gratuita'}
                  </Button>
                </div>

                <p className="pt-2 text-center text-xs leading-5 text-zinc-500">
                  Ao continuar, você concorda com a experiência segura e organizada da plataforma.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
