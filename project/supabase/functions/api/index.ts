import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonRow = Record<string, unknown>;
type Filter = { col: string; val: unknown };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SERVICE_ROLE_KEY') ??
  '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://clinicorganizerpro.netlify.app',
  'https://clinicorganzerpro.netlify.app',
]);

const relationToTable: Record<string, string> = {
  clinics: 'clinics',
  patients: 'patients',
  appointments: 'appointments',
  professionals: 'professionals',
  services: 'services',
  procedures: 'services',
  plans: 'subscription_plans',
  subscription_plans: 'subscription_plans',
  settings: 'clinic_settings',
  system_settings: 'clinic_settings',
  clinic_settings: 'clinic_settings',
  prescriptions: 'prescriptions',
  procedurePhotos: 'procedure_photos',
  procedure_photos: 'procedure_photos',
  anamneses: 'anamneses',
  messages: 'messages',
  campaigns: 'campaigns',
  notifications: 'notifications',
  incomes: 'incomes',
  financial_incomes: 'incomes',
  expenses: 'expenses',
  financial_expenses: 'expenses',
};

const tableColumns: Record<string, Set<string>> = {
  clinics: new Set([
    'id',
    'user_id',
    'plan_id',
    'name',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'cnpj',
    'stripe_customer_id',
    'stripe_subscription_id',
    'plan',
    'subscription_status',
    'current_period_start',
    'current_period_end',
    'trial_ends_at',
    'status',
    'notes',
  ]),
  subscription_plans: new Set([
    'id',
    'name',
    'description',
    'monthly_price',
    'annual_price',
    'stripe_price_id',
    'features',
    'max_users',
    'max_patients',
    'active',
  ]),
  clinic_settings: new Set([
    'id',
    'clinic_id',
    'user_id',
    'clinic_name',
    'clinic_phone',
    'clinic_email',
    'clinic_address',
    'clinic_city',
    'clinic_state',
    'clinic_cnpj',
    'clinic_logo_url',
    'notifications_email',
    'notifications_sms',
    'notifications_whatsapp',
    'notifications_appointment',
    'notifications_payment',
    'team_members_limit',
    'security_two_factor',
    'security_password_reset_required',
  ]),
  patients: new Set([
    'id',
    'user_id',
    'clinic_id',
    'name',
    'email',
    'phone',
    'whatsapp',
    'profile_photo',
    'birth_date',
    'cpf',
    'sex',
    'address',
    'zip_code',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'emergency_contact',
    'emergency_relation',
    'emergency_phone',
    'allergies',
    'current_medications',
    'medical_history',
    'notes',
    'observations',
    'last_visit',
    'next_appointment',
    'status',
    'total_spent',
    'procedures',
  ]),
  services: new Set(['id', 'user_id', 'clinic_id', 'name', 'description', 'price', 'duration_minutes', 'active']),
  anamneses: new Set([
    'id',
    'user_id',
    'clinic_id',
    'patient_id',
    'date',
    'main_complaint',
    'medical_history',
    'allergies',
    'current_medications',
    'family_history',
    'social_history',
    'previous_surgeries',
    'vital_signs',
    'observations',
    'facial_assessment',
    'esthetic_procedures',
    'procedure_details',
    'clinical_notes',
    'aesthetic_photos_before',
    'aesthetic_photos_after',
    'digital_signature',
    'signature_date',
  ]),
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const camelToSnake = (value: string) => value.replace(/([A-Z])/g, '_$1').toLowerCase();
const snakeToCamel = (value: string) => value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());

const transformKeys = (value: unknown, keyTransform: (key: string) => string): unknown => {
  if (Array.isArray(value)) return value.map((entry) => transformKeys(entry, keyTransform));

  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return Object.entries(value as JsonRow).reduce<JsonRow>((acc, [key, entry]) => {
      acc[keyTransform(key)] = transformKeys(entry, keyTransform);
      return acc;
    }, {});
  }

  return value;
};

const json = (data: unknown, status = 200, origin = '') =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });

function corsHeaders(origin: string) {
  const allowedOrigin = allowedOrigins.has(origin.replace(/\/$/, '')) ? origin : 'https://clinicorganizerpro.netlify.app';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
}

const getRelation = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean);
  const apiIndex = parts.lastIndexOf('api');
  return apiIndex >= 0 ? parts[apiIndex + 1] ?? '' : parts.at(-1) ?? '';
};

const parseFilters = (url: URL): Filter[] => {
  const filters: Filter[] = [];
  const indices = new Set<number>();

  for (const key of url.searchParams.keys()) {
    const match = key.match(/^f\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }

  for (const idx of Array.from(indices).sort((a, b) => a - b)) {
    const op = url.searchParams.get(`f.${idx}.op`);
    const col = url.searchParams.get(`f.${idx}.col`);
    const raw = url.searchParams.get(`f.${idx}.val`);
    if (op !== 'eq' || !col || raw === null) continue;

    let val: unknown = raw;
    try {
      val = JSON.parse(raw);
    } catch {
      val = raw;
    }
    filters.push({ col: camelToSnake(col), val });
  }

  return filters;
};

const normalizePayload = (table: string, payload: JsonRow): JsonRow => {
  const columns = tableColumns[table];
  const supportsColumn = (column: string) => !columns || columns.has(column);
  const transformed = transformKeys(payload, camelToSnake) as JsonRow;

  if (table === 'services' && transformed.duration !== undefined && transformed.duration_minutes === undefined) {
    transformed.duration_minutes = transformed.duration;
  }

  if (table === 'subscription_plans' && transformed.price !== undefined && transformed.monthly_price === undefined) {
    transformed.monthly_price = transformed.price;
  }

  const normalized = Object.entries(transformed).reduce<JsonRow>((acc, [key, value]) => {
    if ((!columns || columns.has(key)) && value !== undefined) acc[key] = value;
    return acc;
  }, {});

  if (supportsColumn('clinic_id') && normalized.clinic_id !== undefined && !UUID_RE.test(String(normalized.clinic_id))) {
    delete normalized.clinic_id;
  }

  for (const key of Object.keys(normalized)) {
    if (
      key.endsWith('_id') &&
      key !== 'user_id' &&
      key !== 'clinic_id' &&
      normalized[key] !== null &&
      normalized[key] !== undefined &&
      !UUID_RE.test(String(normalized[key]))
    ) {
      delete normalized[key];
    }
  }

  return normalized;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ data: null, error: { message: 'Supabase secrets missing.' } }, 500, origin);
  }

  const url = new URL(req.url);
  const relation = getRelation(url);

  if (!relation || relation === 'health') {
    return json({ data: { ok: true, service: 'clinic-organizer-supabase-edge-api' }, error: null }, 200, origin);
  }

  const table = relationToTable[relation];
  if (!table) {
    return json({ data: null, error: { message: `Relation not supported: ${relation}` } }, 404, origin);
  }

  try {
    console.info(`[edge-api] ${req.method} ${relation} received`);

    if (req.method === 'GET') {
      let query = supabase.from(table).select('*');
      for (const filter of parseFilters(url)) query = query.eq(filter.col, filter.val);

      const { data, error } = await query;
      if (error) throw error;
      console.info(`[edge-api] GET ${relation} rows=${data?.length ?? 0}`);
      return json({ data: (data ?? []).map((row) => transformKeys(row, snakeToCamel)), error: null }, 200, origin);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const payload = (body?.payload ?? body) as JsonRow;
      const normalized = normalizePayload(table, payload);
      const { data, error } = await supabase.from(table).insert(normalized).select('*').single();
      if (error) throw error;
      console.info(`[edge-api] POST ${relation} saved id=${String((data as JsonRow)?.id ?? '')}`);
      return json({ data: transformKeys(data, snakeToCamel), error: null }, 200, origin);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const id = parseFilters(url).find((filter) => filter.col === 'id')?.val;
      if (typeof id !== 'string') {
        return json({ data: null, error: { message: 'Id filter is required.' } }, 400, origin);
      }
      const body = await req.json().catch(() => ({}));
      const payload = (body?.payload ?? body) as JsonRow;
      const normalized = normalizePayload(table, payload);
      delete normalized.id;
      const { data, error } = await supabase.from(table).update(normalized).eq('id', id).select('*').single();
      if (error) throw error;
      console.info(`[edge-api] PUT ${relation} saved id=${id}`);
      return json({ data: transformKeys(data, snakeToCamel), error: null }, 200, origin);
    }

    if (req.method === 'DELETE') {
      const id = parseFilters(url).find((filter) => filter.col === 'id')?.val;
      if (typeof id !== 'string') {
        return json({ data: null, error: { message: 'Id filter is required.' } }, 400, origin);
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      console.info(`[edge-api] DELETE ${relation} removed id=${id}`);
      return json({ data: null, error: null }, 200, origin);
    }

    return json({ data: null, error: { message: 'Method not allowed.' } }, 405, origin);
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
    console.error(`[edge-api] ${req.method} ${relation} error: ${message}`, error);
    return json({ data: null, error: { message } }, 500, origin);
  }
});
