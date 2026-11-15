import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const SUPABASE = {
  BACKEND: 'supabase',
  SUPABASE_URL: 'https://exemplo.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
};

const ana = {
  id: 'u-ana',
  role: 'lalider',
  full_name: 'Ana Beatriz Silva',
  display_name: 'Ana S.',
  email: 'ana@exemplo.org',
  organization: '',
  country: 'BR',
  state: 'PE',
  city: 'Recife',
  camp: 'VLB32',
  verified: true,
};
const ipe = {
  id: 'u-ipe',
  role: 'donor',
  full_name: 'Ipê Sistemas',
  display_name: 'Ipê Sistemas',
  email: 'contato@ipe.example',
  organization: 'Ipê Sistemas',
  country: 'BR',
  state: 'PE',
  city: 'Recife',
  camp: '',
  verified: false,
};
const publicOf = ({ id, role, display_name, organization, country, state, camp, verified }) => ({
  id,
  role,
  display_name,
  organization,
  country,
  state,
  camp,
  verified,
});

function tables() {
  return {
    public_profiles: [publicOf(ana), publicOf(ipe)],
    profiles: [ana, ipe],
    donations: [
      {
        id: 'd1',
        donor_id: 'u-ipe',
        donor_name: 'Ipê Sistemas',
        category: 'laptop',
        title: 'Lenovo 8GB',
        description: '',
        condition: 'good',
        photos: ['u-ipe/foto.jpg'],
        country: 'BR',
        state: 'PE',
        city: 'Recife',
        status: 'matched',
        matched_to: 'u-ana',
        created_at: '2026-11-10T00:00:00Z',
      },
    ],
    needs: [
      {
        id: 'n1',
        lalider_id: 'u-ana',
        lalider_name: 'Ana S.',
        camp: 'VLB32',
        country: 'BR',
        state: 'PE',
        category: 'laptop',
        title: 'Notebook para Python',
        urgency: 'high',
        status: 'matched',
        created_at: '2026-11-09T00:00:00Z',
      },
    ],
    offers: [
      {
        id: 'o1',
        need_id: 'n1',
        donation_id: 'd1',
        donor_id: 'u-ipe',
        lalider_id: 'u-ana',
        initiated_by: 'donor',
        message: 'Oi',
        status: 'accepted',
        created_at: '2026-11-11T00:00:00Z',
        updated_at: '2026-11-11T00:00:00Z',
      },
    ],
    impact_updates: [],
  };
}

async function boot(fakeOptions) {
  localStorage.clear();
  const fake = createFakeSupabase(fakeOptions);
  window.supabase = { createClient: () => fake };
  const app = loadApp({ keepStorage: true, config: SUPABASE });
  await app.Remote.init();
  return { ...app, fake };
}

describe('Remote (Supabase)', () => {
  beforeEach(() => {
    delete window.supabase;
  });

  it('visitante: carrega dados públicos no Store em memória, sem gravar no localStorage', async () => {
    const { Donations, Auth, Store } = await boot({ tables: tables() });
    expect(Store.mode).toBe('memory');
    expect(Auth.isLoggedIn()).toBe(false);
    expect(Donations.getAll()[0]).toMatchObject({
      id: 'd1',
      donorId: 'u-ipe',
      matchedTo: 'u-ana',
      photos: ['https://cdn.exemplo/u-ipe/foto.jpg'],
    });
    expect(Donations.getAllNeeds()[0]).toMatchObject({ laliderId: 'u-ana', state: 'PE' });
    expect(Object.keys(localStorage).filter((k) => k.startsWith('lala_bridge_'))).toEqual([]);
  });

  it('login: perfil completo, ofertas e contato da outra parte só na oferta aceita', async () => {
    const { Remote, Auth, Offers } = await boot({
      tables: tables(),
      rpc: {
        get_offer_contact: () => ({ name: 'Ipê Sistemas', email: 'contato@ipe.example' }),
      },
    });
    const result = await Remote.login('ana@exemplo.org', 'certa');
    expect(result.success).toBe(true);
    const me = Auth.getCurrentUser();
    expect(me).toMatchObject({ id: 'u-ana', type: 'lalider', name: 'Ana Beatriz Silva' });
    const offer = Offers.getById('o1');
    expect(Offers.getContact(offer, 'u-ana').email).toBe('contato@ipe.example');
  });

  it('senha errada vira mensagem traduzida', async () => {
    const { Remote } = await boot({ tables: tables() });
    const result = await Remote.login('ana@exemplo.org', 'errada');
    expect(result).toEqual({ success: false, message: 'E-mail ou senha inválidos.' });
  });

  it('erros das funções do servidor chegam traduzidos pela chave', async () => {
    const { Remote } = await boot({
      tables: tables(),
      session: { user: { id: 'u-ipe' } },
      rpc: {
        offer_help: () => {
          throw new Error('offers.duplicateOffer');
        },
      },
    });
    const result = await Remote.offerHelp({ needId: 'n1' });
    expect(result.success).toBe(false);
    expect(result.message).toBe('Você já tem uma oferta pendente para este pedido.');
  });

  it('cadastro de Lalíder: confere o código antes e não chama o signUp se for inválido', async () => {
    const { Remote, fake } = await boot({
      tables: tables(),
      rpc: { check_lalider_code: () => ({ valid: false, error: 'auth.nameMismatch' }) },
    });
    const result = await Remote.registerLalider({
      name: 'Impostor',
      email: 'x@exemplo.org',
      password: 'abcdef',
      verificationCode: 'LALA-VLB32-004',
      consent: true,
      country: 'BR',
      state: 'BA',
      city: 'Salvador',
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/nome não confere/);
    expect(fake.calls.signUp).toHaveLength(0);
  });

  it('cadastro de doador com confirmação de e-mail envia os dados do perfil nos metadados', async () => {
    const { Remote, fake } = await boot({ tables: tables() });
    const result = await Remote.registerDonor({
      name: 'Empresa Nova',
      email: 'nova@exemplo.org',
      password: 'abcdef',
      organization: 'Empresa Nova',
      consent: true,
      country: 'BR',
      state: 'sp',
      city: 'São Paulo',
    });
    expect(result).toMatchObject({ success: true, needsConfirmation: true });
    const meta = fake.calls.signUp[0].options.data;
    expect(meta).toMatchObject({
      role: 'donor',
      full_name: 'Empresa Nova',
      consent: true,
      state: 'SP',
      city: 'São Paulo',
    });
    expect(meta.consent_version).toBeTruthy();
  });

  it('a Api escolhe o Remote quando o backend é Supabase', async () => {
    const { Api, Remote } = await boot({ tables: tables() });
    expect(Api.offerHelp).toBeTypeOf('function');
    expect(Api.ready).toBe(Remote.ready);
  });
});
