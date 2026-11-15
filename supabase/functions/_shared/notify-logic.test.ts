import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { decideNotifications, renderEmail, type OfferRow } from './notify-logic.ts';

const base: OfferRow = { id: 'o1', donor_id: 'd', lalider_id: 'l', initiated_by: 'donor', status: 'pending' };

Deno.test('nova oferta avisa quem recebeu', () => {
  assertEquals(decideNotifications({ type: 'INSERT', table: 'offers', record: base, old_record: null }), [
    { to: 'l', event: 'new_offer' },
  ]);
  const fromLalider = { ...base, initiated_by: 'lalider' as const };
  assertEquals(decideNotifications({ type: 'INSERT', table: 'offers', record: fromLalider, old_record: null }), [
    { to: 'd', event: 'new_offer' },
  ]);
});

Deno.test('aceite avisa quem enviou; entrega avisa os dois', () => {
  const accepted = { ...base, status: 'accepted' as const };
  assertEquals(decideNotifications({ type: 'UPDATE', table: 'offers', record: accepted, old_record: base }), [
    { to: 'd', event: 'offer_accepted' },
  ]);
  const delivered = { ...base, status: 'delivered' as const };
  assertEquals(
    decideNotifications({ type: 'UPDATE', table: 'offers', record: delivered, old_record: accepted }).length,
    2,
  );
});

Deno.test('recusa e outras tabelas não geram e-mail', () => {
  const declined = { ...base, status: 'declined' as const };
  assertEquals(decideNotifications({ type: 'UPDATE', table: 'offers', record: declined, old_record: base }), []);
  assertEquals(decideNotifications({ type: 'INSERT', table: 'needs', record: base, old_record: null }), []);
});

Deno.test('e-mail usa só o primeiro nome e escapa HTML', () => {
  const email = renderEmail('new_offer', 'Ana <b>Silva</b>', 'https://lala.vercel.app/');
  assertStringIncludes(email.text, 'Olá, Ana!');
  assertStringIncludes(email.html, 'https://lala.vercel.app/dashboard.html');
  assertEquals(email.html.includes('<b>'), false);
});
