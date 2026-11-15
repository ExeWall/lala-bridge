/**
 * LALA Bridge — armazenamento dos dados no navegador
 *
 * Todos os módulos leem e gravam por aqui, nunca direto no localStorage.
 *
 * - Modo local (sem backend): grava no localStorage. É o modo da demonstração
 *   offline e dos testes.
 * - Modo Supabase: guarda só em memória. Os dados vêm do servidor (js/remote.js),
 *   respeitando as regras de acesso (RLS), e somem ao fechar a aba. Assim,
 *   dados de outras pessoas nunca ficam gravados no dispositivo.
 */

const Store = {
  memory: new Map(),

  get mode() {
    return LALA_CONFIG.BACKEND === 'supabase' ? 'memory' : 'local';
  },

  has(key) {
    if (this.mode === 'memory') return this.memory.has(key);
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },

  /** Lê um valor JSON. Devolve `fallback` se não existir ou estiver corrompido. */
  get(key, fallback = null) {
    if (this.mode === 'memory') {
      return this.memory.has(key) ? structuredClone(this.memory.get(key)) : fallback;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    if (this.mode === 'memory') {
      this.memory.set(key, structuredClone(value));
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    if (this.mode === 'memory') {
      this.memory.delete(key);
      return;
    }
    localStorage.removeItem(key);
  },

  /** Apaga tudo (usado ao sair no modo Supabase). */
  clearMemory() {
    this.memory.clear();
  },
};

window.Store = Store;
