import { Router, type Request, type Response } from 'express';
import { createItem, deleteItem, readData, updateItem } from '../services/database.js';

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
    case 'patients':
      return 'pacientes.json';
    case 'appointments':
      return 'agendamentos.json';
    case 'anamneses':
      return 'anamneses.json';
    case 'users':
      return 'usuarios.json';
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

export const localApiRouter = Router();

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

    return ensureOkResponse(filtered, null, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
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
    const created = await createItem<JsonRow & { id: string }>(
      file,
      payload as JsonRow & { id?: string },
    );
    return ensureOkResponse(created, null, res);
  } catch {
    return ensureOkResponse(null, { message: 'Unknown error' }, res);
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

    const updated = await updateItem<JsonRow & { id: string }>(file, idFilter.val, payload as JsonRow & {
      id?: string;
    });
    return ensureOkResponse(updated, null, res);
  } catch {
    return ensureOkResponse(null, { message: 'Unknown error' }, res);
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

    await deleteItem<JsonRow & { id: string }>(file, idFilter.val);
    return ensureOkResponse(null, null, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return ensureOkResponse(null, { message }, res);
  }
});
