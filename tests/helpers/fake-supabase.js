/**
 * Cliente falso do Supabase para testar js/remote.js sem rede.
 * Guarda as tabelas em memória e registra as chamadas de RPC.
 */
export function createFakeSupabase({ tables = {}, rpc = {}, session = null } = {}) {
  const calls = { rpc: [], signUp: [], insert: [] };
  let currentSession = session;

  const builder = (table) => {
    let rows = [...(tables[table] || [])];
    const q = {
      select() {
        return q;
      },
      order() {
        return q;
      },
      eq(col, value) {
        rows = rows.filter((r) => r[col] === value);
        return q;
      },
      maybeSingle() {
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      single() {
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      insert(row) {
        calls.insert.push({ table, row });
        const saved = { id: `${table}-new`, created_at: '2026-11-15T00:00:00Z', ...row };
        tables[table] = [saved, ...(tables[table] || [])];
        rows = [saved];
        return q;
      },
      then(resolve) {
        return resolve({ data: rows, error: null });
      },
    };
    return q;
  };

  const client = {
    calls,
    tables,
    from: builder,
    rpc(name, params) {
      calls.rpc.push({ name, params });
      const handler = rpc[name];
      if (!handler) return Promise.resolve({ data: null, error: null });
      try {
        return Promise.resolve({ data: handler(params, currentSession), error: null });
      } catch (err) {
        return Promise.resolve({ data: null, error: { message: err.message } });
      }
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: currentSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signUp(args) {
        calls.signUp.push(args);
        return Promise.resolve({ data: { session: null, user: { id: 'novo' } }, error: null });
      },
      signInWithPassword({ email, password }) {
        if (password !== 'certa') {
          return Promise.resolve({ data: {}, error: { message: 'Invalid login credentials' } });
        }
        const user = (tables.profiles || []).find((p) => p.email === email);
        currentSession = { user: { id: user.id } };
        return Promise.resolve({ data: { session: currentSession }, error: null });
      },
      signOut() {
        currentSession = null;
        return Promise.resolve({ error: null });
      },
    },
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.exemplo/${path}` } }),
        upload: () => Promise.resolve({ error: null }),
      }),
    },
  };
  return client;
}
