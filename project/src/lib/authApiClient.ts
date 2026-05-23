import { apiFetch, apiRequest, createApiUrl, readApiJson } from './api';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export type SignupInput = {
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
};

export type AuthMeResponse = {
  id: string;
  email: string;
  role: string;
  clinicId?: string;
  responsibleName?: string;
  clinic?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    cnpj?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

export type UpsertAuthUserInput = {
  email: string;
  password?: string;
  role?: string;
  clinicId?: string;
};

export async function loginWithBackend(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('Resposta JWT inválida do backend.');
  }

  return data;
}

export async function fetchBackendMe(accessToken: string): Promise<AuthMeResponse> {
  const data = await apiRequest<AuthMeResponse>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!data?.id || !data.email) {
    throw new Error('Resposta JWT inválida do backend (/me).');
  }

  return data;
}

export async function registerBackendUser(input: {
  name?: string;
  email: string;
  password: string;
  clinicId?: string;
  fullName?: string;
  clinicName?: string;
  phone?: string;
  cnpj?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
}): Promise<{ id?: string; email?: string; clinicId?: string }> {
  const name = input.name ?? input.fullName ?? '';
  const data = await apiRequest<{ user?: { id?: string; email?: string; clinicId?: string } }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email: input.email.trim().toLowerCase(),
      password: input.password,
      clinicId: input.clinicId ?? '',
      clinicName: input.clinicName ?? '',
      phone: input.phone ?? '',
      cnpj: input.cnpj ?? '',
      cep: input.cep ?? '',
      address: input.address ?? '',
      addressNumber: input.addressNumber ?? '',
      city: input.city ?? '',
      state: input.state ?? '',
    }),
  });

  return data?.user ?? {};
}

export async function logoutBackend(refreshToken: string): Promise<void> {
  await apiRequest<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function upsertBackendAuthUser(accessToken: string, input: UpsertAuthUserInput): Promise<void> {
  await apiRequest<{ ok: true }>('/api/admin/users/upsert', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role ?? 'staff',
      clinicId: input.clinicId ?? '',
    }),
  });
}

export async function deleteBackendAuthUser(accessToken: string, email: string): Promise<void> {
  const url = createApiUrl('/api/admin/users');
  url.searchParams.set('email', email.trim().toLowerCase());

  const response = await apiFetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readApiJson<{ ok: true }>(response).catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Falha ao remover usuário (${response.status})`);
  }
}
