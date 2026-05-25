import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createItem, deleteItem, readData, updateItem } from '../services/database.js';
import { readEnv, readSupabaseServiceKey, readSupabaseUrl } from '../utils/supabaseEnv.js';

type FilterOp = 'eq';

type Filter = {
  op: FilterOp;
  col: string;
  val: unknown;
};

const coerceQueryString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
};

const parseFilters = (req: Request): Filter[] => {
  const filters: Filter[] = [];
  const query = req.query as Record<string, unknown>;

  const indices = new Set<number>();
  for (const key of Object.keys(query)) {
    const m = key.match(/^f\.(\d+)\./);
    if (m) indices.add(Number(m[1]));
  }

  const sorted = Array.from(indices).sort((a, b) => a - b);

  for (const idx of sorted) {
    const op = coerceQueryString(query[`f.${idx}.op`]);
    const col = coerceQueryString(query[`f.${idx}.col`]);
    const valRaw = coerceQueryString(query[`f.${idx}.val`]);

    if (!op || !col || !valRaw) continue;
    if (op !== 'eq') continue;

    let val: unknown;
    try {
      val = JSON.parse(valRaw);
    } catch {
      val = valRaw;
    }

    filters.push({ op: 'eq', col, val });
  }

  return filters;
};

const filterEquals = (row: Record<string, unknown>, col: string, val: unknown) => {
  return row[col] === val;
};

const fileForRelation = (relation: string) => {
  switch (relation) {
    case 'clinics':
      return 'clinics.json';
    case 'patients':
      return 'pacientes.json';
    case 'appointments':
      return 'agendamentos.json';
    case 'professionals':
      return 'professionals.json';
    case 'services':
    case 'procedures':
      return 'services.json';
    case 'plans':
    case 'subscription_plans':
      return 'plans.json';
    case 'settings':
    case 'system_settings':
    case 'clinic_settings':
      return 'settings.json';
    case 'procedurePhotos':
    case 'procedure_photos':
      return 'procedure_photos.json';
    case 'anamneses':
      return 'anamneses.json';
    case 'prescriptions':
      return 'prescriptions.json';
    case 'messages':
      return 'messages.json';
    case 'campaigns':
      return 'campaigns.json';
    case 'notifications':
      return 'notifications.json';
    case 'users':
      return 'usuarios.json';
    case 'financeiro':
    case 'financial':
      return 'financeiro.json';
    case 'incomes':
    case 'financial_incomes':
      return 'incomes.json';
    case 'expenses':
    case 'financial_expenses':
      return 'expenses.json';
    default:
      return `${relation}.json`;
  }
};

const legacyFinancialFileForRelation = (relation: string) => {
  return relation === 'incomes' ||
    relation === 'financial_incomes' ||
    relation === 'expenses' ||
    relation === 'financial_expenses'
    ? 'financeiro.json'
    : null;
};

const isIncomeRelation = (relation: string) => relation === 'incomes' || relation === 'financial_incomes';
const isExpenseRelation = (relation: string) => relation === 'expenses' || relation === 'financial_expenses';

const belongsToFinancialRelation = (relation: string, row: JsonRow) => {
  const id = typeof row.id === 'string' ? row.id : '';
  if (isIncomeRelation(relation)) {
    return id.startsWith('income_') || 'patientName' in row || 'patient_name' in row || 'service' in row;
  }

  if (isExpenseRelation(relation)) {
    return id.startsWith('expense_') || 'description' in row;
  }

  return true;
};

const readRowsForRelation = async (relation: string, file: string) => {
  const primaryRows = await readData<JsonRow>(file);
  const legacyFile = legacyFinancialFileForRelation(relation);

  if (!legacyFile || legacyFile === file) {
    return primaryRows;
  }

  const legacyRows = (await readData<JsonRow>(legacyFile)).filter((row) => belongsToFinancialRelation(relation, row));
  const primaryIds = new Set(primaryRows.map((row) => row.id).filter((id): id is string => typeof id === 'string'));
  const legacyOnly = legacyRows.filter((row) => typeof row.id !== 'string' || !primaryIds.has(row.id));

  return [...legacyOnly, ...primaryRows];
};

const ensureOkResponse = <T,>(data: T, error: { message: string } | null, res: Response) => {
  res.json({ data, error });
};

type JsonRow = Record<string, unknown>;

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Unknown error';
};

export const localApiRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedSupabaseAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = () => {
  const url = readSupabaseUrl();
  const key = readSupabaseServiceKey();

  if (!url || !key) return null;

  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedSupabaseAdmin;
};

const camelToSnake = (value: string) => value.replace(/([A-Z])/g, '_$1').toLowerCase();
const snakeToCamel = (value: string) => value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());

const transformKeys = (value: unknown, keyTransform: (key: string) => string): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => transformKeys(entry, keyTransform));
  }

  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return Object.entries(value as JsonRow).reduce<JsonRow>((accumulator, [key, entry]) => {
      accumulator[keyTransform(key)] = transformKeys(entry, keyTransform);
      return accumulator;
    }, {});
  }

  return value;
};

const relationToSupabaseTable = (relation: string) => {
  switch (relation) {
    case 'clinics':
      return 'clinics';
    case 'patients':
      return 'patients';
    case 'appointments':
      return 'appointments';
    case 'professionals':
      return 'professionals';
    case 'services':
    case 'procedures':
      return 'services';
    case 'plans':
    case 'subscription_plans':
      return 'subscription_plans';
    case 'settings':
    case 'system_settings':
    case 'clinic_settings':
      return 'clinic_settings';
    case 'prescriptions':
      return 'prescriptions';
    case 'procedurePhotos':
    case 'procedure_photos':
      return 'procedure_photos';
    case 'anamneses':
      return 'anamneses';
    case 'messages':
      return 'messages';
    case 'campaigns':
      return 'campaigns';
    case 'notifications':
      return 'notifications';
    case 'incomes':
    case 'financial_incomes':
      return 'incomes';
    case 'expenses':
    case 'financial_expenses':
      return 'expenses';
    default:
      return null;
  }
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
  incomes: new Set([
    'id',
    'user_id',
    'clinic_id',
    'patient_id',
    'patient_name',
    'service',
    'payment_method',
    'amount',
    'status',
    'attendance_date',
    'observations',
  ]),
  expenses: new Set([
    'id',
    'user_id',
    'clinic_id',
    'description',
    'category',
    'amount',
    'date',
    'payment_method',
    'status',
    'observations',
  ]),
  services: new Set([
    'id',
    'user_id',
    'clinic_id',
    'name',
    'description',
    'price',
    'duration_minutes',
    'active',
  ]),
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

const uuidIdTables = new Set([
  'clinics',
  'clinic_settings',
  'subscription_plans',
  'patients',
  'appointments',
  'prescriptions',
  'procedure_photos',
  'anamneses',
  'messages',
  'campaigns',
  'notifications',
  'incomes',
  'expenses',
  'professionals',
  'services',
]);

const findSupabaseAuthUserByEmail = async (supabase: SupabaseClient, email: string) => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return null;

    const found = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 100) return null;
  }

  return null;
};

const getDefaultOwner = async (supabase: SupabaseClient) => {
  const adminEmail = readEnv('ADMIN_LOGIN_EMAIL') || 'clinicorganizerpro@gmail.com';
  const user = await findSupabaseAuthUserByEmail(supabase, adminEmail.trim().toLowerCase());

  if (!user?.id) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', user.id)
    .maybeSingle();

  let clinicId = typeof profile?.clinic_id === 'string' ? profile.clinic_id : '';

  if (!clinicId) {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    clinicId = typeof clinic?.id === 'string' ? clinic.id : '';
  }

  return { userId: user.id, clinicId };
};

const normalizeSupabasePayload = async (supabase: SupabaseClient, table: string, payload: JsonRow) => {
  const columns = tableColumns[table];
  const supportsColumn = (column: string) => !columns || columns.has(column);
  const owner = await getDefaultOwner(supabase);
  const transformed = transformKeys(payload, camelToSnake) as JsonRow;

  if (table === 'services' && transformed.duration !== undefined && transformed.duration_minutes === undefined) {
    transformed.duration_minutes = transformed.duration;
  }

  if (table === 'subscription_plans' && transformed.price !== undefined && transformed.monthly_price === undefined) {
    transformed.monthly_price = transformed.price;
  }

  const normalized = Object.entries(transformed).reduce<JsonRow>((accumulator, [key, value]) => {
    if ((!columns || columns.has(key)) && value !== undefined) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  if (uuidIdTables.has(table) && typeof normalized.id === 'string' && !UUID_RE.test(normalized.id)) {
    delete normalized.id;
  }

  if (table === 'incomes' && typeof normalized.patient_id === 'string' && !UUID_RE.test(normalized.patient_id)) {
    delete normalized.patient_id;
  }

  if (supportsColumn('user_id') && !UUID_RE.test(String(normalized.user_id ?? '')) && owner?.userId) {
    normalized.user_id = owner.userId;
  }

  if (supportsColumn('clinic_id') && !UUID_RE.test(String(normalized.clinic_id ?? '')) && owner?.clinicId) {
    normalized.clinic_id = owner.clinicId;
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

const normalizeSupabaseFilters = async (supabase: SupabaseClient, filters: Filter[]) => {
  const owner = await getDefaultOwner(supabase);

  return filters.map((filter) => {
    if ((filter.col === 'user_id' || filter.col === 'userId') && !UUID_RE.test(String(filter.val ?? '')) && owner?.userId) {
      return { ...filter, col: 'user_id', val: owner.userId };
    }

    if ((filter.col === 'clinic_id' || filter.col === 'clinicId') && !UUID_RE.test(String(filter.val ?? '')) && owner?.clinicId) {
      return { ...filter, col: 'clinic_id', val: owner.clinicId };
    }

    return { ...filter, col: camelToSnake(filter.col) };
  });
};

const listSupabaseRows = async (relation: string, filters: Filter[]) => {
  const supabase = getSupabaseAdmin();
  const table = relationToSupabaseTable(relation);
  if (!supabase || !table) return null;

  let query = supabase.from(table).select('*');
  const normalizedFilters = await normalizeSupabaseFilters(supabase, filters);
  for (const filter of normalizedFilters) {
    query = query.eq(filter.col, filter.val);
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as JsonRow[]).map((row) => transformKeys(row, snakeToCamel) as JsonRow);
};

const createSupabaseRow = async (relation: string, payload: JsonRow) => {
  const supabase = getSupabaseAdmin();
  const table = relationToSupabaseTable(relation);
  if (!supabase || !table) return null;

  const normalized = await normalizeSupabasePayload(supabase, table, payload);
  const { data, error } = await supabase.from(table).insert(normalized).select('*').single();
  if (error) throw error;

  return transformKeys(data as JsonRow, snakeToCamel) as JsonRow;
};

const updateSupabaseRow = async (relation: string, id: string, payload: JsonRow) => {
  const supabase = getSupabaseAdmin();
  const table = relationToSupabaseTable(relation);
  if (!supabase || !table) return null;

  const normalized = await normalizeSupabasePayload(supabase, table, payload);
  delete normalized.id;

  const { data, error } = await supabase.from(table).update(normalized).eq('id', id).select('*').single();
  if (error) throw error;

  return transformKeys(data as JsonRow, snakeToCamel) as JsonRow;
};

const deleteSupabaseRow = async (relation: string, id: string) => {
  const supabase = getSupabaseAdmin();
  const table = relationToSupabaseTable(relation);
  if (!supabase || !table) return false;

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;

  return true;
};

localApiRouter.get('/_ready', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

localApiRouter.get('/:relation', async (req: Request, res: Response) => {
  const relation = String(req.params.relation);
  const file = fileForRelation(relation);
  const filters = parseFilters(req);

  const orderCol = coerceQueryString(req.query['order.col']);
  const orderAscendingRaw = coerceQueryString(req.query['order.ascending']);
  const orderAscending =
    orderAscendingRaw === null ? true : orderAscendingRaw.toLowerCase() === 'true';

  try {
    const supabaseRows = await listSupabaseRows(relation, filters);
    if (supabaseRows) {
      // eslint-disable-next-line no-console
      console.info(`[api:data] GET ${relation} from supabase rows=${supabaseRows.length}`);
      return ensureOkResponse(supabaseRows, null, res);
    }

    const rows = await readRowsForRelation(relation, file);

    const filtered =
      filters.length === 0
        ? rows
        : rows.filter((row: Record<string, unknown>) =>
            filters.every((f) => filterEquals(row, f.col, f.val)),
          );

    if (orderCol) {
      const next = [...filtered].sort((a, b) => {
        const av = a[orderCol];
        const bv = b[orderCol];

        if (av === bv) return 0;
        if (av === undefined) return 1;
        if (bv === undefined) return -1;

        if (typeof av === 'number' && typeof bv === 'number') {
          return orderAscending ? av - bv : bv - av;
        }

        const as = String(av);
        const bs = String(bv);

        return orderAscending ? as.localeCompare(bs) : bs.localeCompare(as);
      });

      return ensureOkResponse(next, null, res);
    }

    // eslint-disable-next-line no-console
    console.info(`[api:data] GET ${relation} from file=${file} rows=${filtered.length}`);
    return ensureOkResponse(filtered, null, res);
  } catch (err) {
    const message = getErrorMessage(err);
    // eslint-disable-next-line no-console
    console.error(`[api:data] GET ${relation} error: ${message}`, err);
    return ensureOkResponse([] as JsonRow[], { message }, res);
  }
});

localApiRouter.post('/:relation', async (req: Request, res: Response) => {
  const relation = String(req.params.relation);
  const file = fileForRelation(relation);

  const bodyAny = req.body as unknown;

  let parsedBody: unknown = bodyAny;
  if (typeof bodyAny === 'string') {
    try {
      parsedBody = JSON.parse(bodyAny);
    } catch {
      parsedBody = bodyAny;
    }
  }

  const payload =
    (parsedBody as { payload?: unknown } | undefined)?.payload ??
    (parsedBody as unknown);

  if (!payload || typeof payload !== 'object') {
    return ensureOkResponse(null, { message: 'Payload inválido' }, res);
  }

  try {
    // eslint-disable-next-line no-console
    console.info(`[api:data] POST ${relation} received`);
    const supabaseCreated = await createSupabaseRow(relation, payload as JsonRow);
    if (supabaseCreated) {
      // eslint-disable-next-line no-console
      console.info(`[api:data] POST ${relation} saved to supabase id=${String(supabaseCreated.id ?? '')}`);
      return ensureOkResponse(supabaseCreated, null, res);
    }

    const created = await createItem<JsonRow & { id: string }>(
      file,
      payload as JsonRow & { id?: string },
    );
    // eslint-disable-next-line no-console
    console.info(`[api:data] POST ${relation} saved to file=${file} id=${created.id}`);
    return ensureOkResponse(created, null, res);
  } catch (err) {
    const message = getErrorMessage(err);
    // eslint-disable-next-line no-console
    console.error(`[api:data] POST ${relation} error: ${message}`, err);
    return ensureOkResponse(null, { message }, res);
  }
});

localApiRouter.put('/:relation', async (req: Request, res: Response) => {
  const relation = String(req.params.relation);
  const file = fileForRelation(relation);

  const payload = (req.body as { payload?: unknown } | undefined)?.payload;

  if (!payload || typeof payload !== 'object') {
    return ensureOkResponse(null, { message: 'Payload inválido' }, res);
  }

  const filters = parseFilters(req);
  const idFilter = filters.find((f) => f.col === 'id');

  try {
    if (!idFilter) {
      return ensureOkResponse(null, { message: 'Filtro id ausente' }, res);
    }

    if (typeof idFilter.val !== 'string') {
      return ensureOkResponse(null, { message: 'Id inválido' }, res);
    }

    const supabaseUpdated = await updateSupabaseRow(relation, idFilter.val, payload as JsonRow);
    if (supabaseUpdated) {
      // eslint-disable-next-line no-console
      console.info(`[api:data] PUT ${relation} saved to supabase id=${idFilter.val}`);
      return ensureOkResponse(supabaseUpdated, null, res);
    }

    const updated = await updateItem<JsonRow & { id: string }>(file, idFilter.val, payload as JsonRow & {
      id?: string;
    });
    // eslint-disable-next-line no-console
    console.info(`[api:data] PUT ${relation} saved to file=${file} id=${idFilter.val}`);
    return ensureOkResponse(updated, null, res);
  } catch (err) {
    const message = getErrorMessage(err);
    // eslint-disable-next-line no-console
    console.error(`[api:data] PUT ${relation} error: ${message}`, err);
    return ensureOkResponse(null, { message }, res);
  }
});

localApiRouter.delete('/:relation', async (req: Request, res: Response) => {
  const relation = String(req.params.relation);
  const file = fileForRelation(relation);

  const filters = parseFilters(req);
  const idFilter = filters.find((f) => f.col === 'id');

  try {
    if (!idFilter) {
      return ensureOkResponse(null, { message: 'Filtro id ausente' }, res);
    }

    if (typeof idFilter.val !== 'string') {
      return ensureOkResponse(null, { message: 'Id inválido' }, res);
    }

    const supabaseDeleted = await deleteSupabaseRow(relation, idFilter.val);
    if (supabaseDeleted) {
      // eslint-disable-next-line no-console
      console.info(`[api:data] DELETE ${relation} removed from supabase id=${idFilter.val}`);
      return ensureOkResponse(null, null, res);
    }

    await deleteItem<JsonRow & { id: string }>(file, idFilter.val);
    // eslint-disable-next-line no-console
    console.info(`[api:data] DELETE ${relation} removed from file=${file} id=${idFilter.val}`);
    return ensureOkResponse(null, null, res);
  } catch (err) {
    const message = getErrorMessage(err);
    // eslint-disable-next-line no-console
    console.error(`[api:data] DELETE ${relation} error: ${message}`, err);
    return ensureOkResponse(null, { message }, res);
  }
});
