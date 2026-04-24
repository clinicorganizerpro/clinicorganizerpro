import { createClient, type InValue } from "@libsql/client";

// Conexão com Bolt Database via LibSQL
const client = createClient({
  url: import.meta.env.VITE_TURSO_CONNECTION_URL || "",
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || "",
});

export default client;

// Helper para executar queries
export async function executeQuery(sql: string, params?: InValue[]) {
  try {
    const result = await client.execute(sql, params || []);
    return { data: result.rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Helper para queries que retornam um único resultado
export async function executeSingle(sql: string, params?: InValue[]) {
  try {
    const result = await client.execute(sql, params || []);
    return { data: result.rows?.[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Helper para inserts/updates/deletes
export async function executeUpdate(sql: string, params?: InValue[]) {
  try {
    const result = await client.execute(sql, params || []);
    return { success: true, changes: result.rowsAffected, error: null };
  } catch (error) {
    return { success: false, changes: 0, error };
  }
}
