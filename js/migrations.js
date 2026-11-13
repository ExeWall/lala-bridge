/**
 * LALA Bridge — migrações dos dados do localStorage
 *
 * Cada migração recebe a versão anterior dos dados e a deixa no formato
 * atual. As migrações são idempotentes e rodam uma vez por navegador.
 */

const Migrations = {
  VERSION_KEY: 'lala_bridge_schema_version',
  CURRENT_VERSION: 3,

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

    /**
     * v2 → v3: localização e áreas padronizadas.
     * - País em texto (inglês) vira código ISO ("Brazil" → "BR").
     * - Doações antigas com "Cidade, País" em texto livre viram city + country.
     * - No Brasil, o nome do estado vira UF ("Pernambuco" → "PE").
     * - Área de interesse em texto (inglês) vira id ("Data Science & AI" → "data").
     */
    3() {
      const codes = MockDB.legacyCountryCodes;
      const toCode = (value) => {
        if (!value) return value;
        if (/^[A-Z]{2}$/.test(value)) return value;
        return codes[value] || value;
      };
      const ufByName = new Map(MockDB.brazilStates.map((s) => [Auth.normalizeName(s.name), s.uf]));
      const toUf = (value) => {
        if (!value) return '';
        const upper = value.trim().toUpperCase();
        if (MockDB.brazilStates.some((s) => s.uf === upper)) return upper;
        return ufByName.get(Auth.normalizeName(value)) || value;
      };
      const fixLocation = (item) => {
        const out = { ...item };
        let country = toCode(out.country);
        if (country && !/^[A-Z]{2}$/.test(country) && country.includes(',')) {
          const parts = country.split(',').map((p) => p.trim());
          const last = toCode(parts[parts.length - 1]);
          if (/^[A-Z]{2}$/.test(last)) {
            country = last;
            out.city = out.city || parts.slice(0, -1).join(', ');
          }
        }
        out.country = country;
        if (country === 'BR' && out.state) out.state = toUf(out.state);
        return out;
      };

      const users = Migrations._read(Auth.STORAGE_KEY).map((u) => {
        const out = fixLocation(u);
        if (out.areaOfInterest && MockDB.legacyAreaIds[out.areaOfInterest]) {
          out.areaOfInterest = MockDB.legacyAreaIds[out.areaOfInterest];
        }
        return out;
      });
      Migrations._write(Auth.STORAGE_KEY, users);
      Migrations._write(
        Donations.STORAGE_KEY,
        Migrations._read(Donations.STORAGE_KEY).map(fixLocation)
      );
      Migrations._write(
        Donations.NEEDS_KEY,
        Migrations._read(Donations.NEEDS_KEY).map(fixLocation)
      );
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
