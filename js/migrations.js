/**
 * LALA Bridge — migrações dos dados do localStorage
 *
 * Cada migração recebe a versão anterior dos dados e a deixa no formato
 * atual. As migrações são idempotentes e rodam uma vez por navegador.
 */

const Migrations = {
  VERSION_KEY: 'lala_bridge_schema_version',
  CURRENT_VERSION: 2,

  getVersion() {
    return parseInt(localStorage.getItem(this.VERSION_KEY) || '1', 10);
  },

  _read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  steps: {
    /**
     * v1 → v2: padroniza IDs. Pedidos (`laliderId`) e doações (`matchedTo`)
     * guardavam o código de verificação; agora guardam sempre `user.id`.
     */
    2() {
      const users = Migrations._read(Auth.STORAGE_KEY);
      const idByCode = new Map(
        users.filter((u) => u.verificationCode).map((u) => [u.verificationCode.toUpperCase(), u.id])
      );
      const toUserId = (value) =>
        typeof value === 'string' && idByCode.has(value.toUpperCase())
          ? idByCode.get(value.toUpperCase())
          : value;

      const needs = Migrations._read(Donations.NEEDS_KEY).map((n) => ({
        ...n,
        laliderId: toUserId(n.laliderId),
      }));
      Migrations._write(Donations.NEEDS_KEY, needs);

      const donations = Migrations._read(Donations.STORAGE_KEY).map((d) =>
        d.matchedTo ? { ...d, matchedTo: toUserId(d.matchedTo) } : d
      );
      Migrations._write(Donations.STORAGE_KEY, donations);
    },
  },

  run() {
    let version = this.getVersion();
    while (version < this.CURRENT_VERSION) {
      version += 1;
      this.steps[version]?.();
      localStorage.setItem(this.VERSION_KEY, String(version));
    }
  },
};

Migrations.run();

window.Migrations = Migrations;
