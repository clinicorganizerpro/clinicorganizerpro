import { createSupabaseCrud, type SupabaseRecord } from '@/services/supabaseCrudService';

export type InventoryItem = SupabaseRecord & {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  minimumQuantity?: number;
  unit?: string;
  cost?: number;
  active?: boolean;
};

const inventoryCrud = createSupabaseCrud<InventoryItem>('inventory_items');

export const listInventoryItems = () => inventoryCrud.list();
export const getInventoryItemById = (id: string) => inventoryCrud.getById(id);
export const createInventoryItem = (data: Partial<InventoryItem>) => inventoryCrud.create(data);
export const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => inventoryCrud.update(id, data);
export const removeInventoryItem = (id: string) => inventoryCrud.remove(id);
