/**
 * Popula um projeto Supabase com os dados FICTÍCIOS de demonstração
 * (as mesmas pessoas, doações e pedidos do modo local).
 *
 * Uso (uma vez, no seu computador; a chave de serviço nunca vai para o site):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... LALA_DEMO_PASSWORD=... npm run seed:demo
 *
 * Antes, aplique as migrações e o supabase/seed.sql (códigos de exemplo).
 * As contas demo usam e-mails @exemplo.org e a senha LALA_DEMO_PASSWORD, que
 * também vai nas variáveis da Vercel para os botões "Entrar como demo".
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LALA_DEMO_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LALA_DEMO_PASSWORD) {
  console.error('Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e LALA_DEMO_PASSWORD.');
  process.exit(1);
}

// Carrega o MockDB do front-end sem navegador.
const window = {};
const MockDB = new Function('window', `${readFileSync('js/mock-data.js', 'utf8')}; return MockDB;`)(
  window
);

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function ensureUser(u) {
  const role = u.type === 'admin' ? 'donor' : u.type; // admin é promovido depois
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.users.find((x) => x.email === u.email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    password: LALA_DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: u.name,
      organization: u.organization || '',
      verification_code: u.verificationCode || '',
      country: u.country,
      state: u.state,
      city: u.city,
      area_of_interest: u.areaOfInterest || '',
      shower_song: u.showerSong || '',
      consent: true,
      consent_version: 'demo',
    },
  });
  if (error) throw new Error(`${u.email}: ${error.message}`);
  if (u.type === 'admin') {
    await db.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }
  return data.user.id;
}

const ids = {};
for (const u of MockDB.demoUsers) {
  ids[u.id] = await ensureUser(u);
  console.log('conta demo:', u.email);
}

const donationIds = {};
for (const d of MockDB.sampleDonations) {
  const { data, error } = await db
    .from('donations')
    .insert({
      donor_id: ids[d.donorId],
      category: d.category,
      title: d.title,
      description: d.description,
      condition: d.condition,
      country: d.country,
      state: d.state,
      city: d.city,
      created_at: d.createdAt,
    })
    .select('id')
    .single();
  if (error) throw error;
  donationIds[d.id] = data.id;
}

const needIds = {};
for (const n of MockDB.sampleNeeds) {
  const { data, error } = await db
    .from('needs')
    .insert({
      lalider_id: ids[n.laliderId],
      category: n.category,
      title: n.title,
      description: n.description,
      intended_use: n.intendedUse || '',
      requirements: n.requirements || {},
      urgency: n.urgency,
      created_at: n.createdAt,
    })
    .select('id')
    .single();
  if (error) throw error;
  needIds[n.id] = data.id;
}

for (const o of MockDB.sampleOffers) {
  const { data, error } = await db
    .from('offers')
    .insert({
      need_id: o.needId ? needIds[o.needId] : null,
      donation_id: o.donationId ? donationIds[o.donationId] : null,
      donor_id: ids[o.donorId],
      lalider_id: ids[o.laliderId],
      initiated_by: o.initiatedBy,
      message: o.message,
      status: o.status,
      accepted_at: o.acceptedAt,
    })
    .select('id')
    .single();
  if (error) throw error;
  if (o.status === 'accepted' && o.donationId) {
    await db
      .from('donations')
      .update({ status: 'matched', matched_to: ids[o.laliderId], offer_id: data.id })
      .eq('id', donationIds[o.donationId]);
  }
}

console.log('Pronto: dados de demonstração criados.');
