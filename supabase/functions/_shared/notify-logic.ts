// Decide quem recebe e-mail quando uma oferta muda (sem efeitos colaterais,
// para ser testável). Os e-mails não repetem a mensagem da oferta nem dados
// pessoais: só avisam que há algo novo no painel.

export type OfferRow = {
  id: string;
  donor_id: string | null;
  lalider_id: string | null;
  initiated_by: 'donor' | 'lalider';
  status: 'pending' | 'accepted' | 'declined' | 'delivered';
};

export type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: OfferRow | null;
  old_record: OfferRow | null;
};

export type Notification = { to: string; event: 'new_offer' | 'offer_accepted' | 'delivered' };

export function decideNotifications(p: WebhookPayload): Notification[] {
  if (p.table !== 'offers' || !p.record) return [];
  const o = p.record;
  const recipient = o.initiated_by === 'donor' ? o.lalider_id : o.donor_id;
  const initiator = o.initiated_by === 'donor' ? o.donor_id : o.lalider_id;
  const out: Notification[] = [];
  if (p.type === 'INSERT' && o.status === 'pending' && recipient) {
    out.push({ to: recipient, event: 'new_offer' });
  }
  if (p.type === 'UPDATE' && p.old_record?.status === 'pending' && o.status === 'accepted' && initiator) {
    out.push({ to: initiator, event: 'offer_accepted' });
  }
  if (p.type === 'UPDATE' && p.old_record?.status === 'accepted' && o.status === 'delivered') {
    for (const id of [o.donor_id, o.lalider_id]) if (id) out.push({ to: id, event: 'delivered' });
  }
  return out;
}

const TEXTS = {
  new_offer: {
    subject: 'Você recebeu uma nova oferta no LALA Bridge',
    body: 'Alguém quer se conectar com você no LALA Bridge. Entre no seu painel para aceitar ou recusar.',
  },
  offer_accepted: {
    subject: 'Sua oferta foi aceita!',
    body: 'Sua oferta no LALA Bridge foi aceita. Os contatos já aparecem no seu painel para vocês combinarem a entrega.',
  },
  delivered: {
    subject: 'Entrega confirmada no LALA Bridge',
    body: 'A entrega foi confirmada. Obrigado por fazer parte desta ponte!',
  },
} as const;

export function renderEmail(event: Notification['event'], name: string, appUrl: string) {
  const t = TEXTS[event];
  const link = `${appUrl.replace(/\/$/, '')}/dashboard.html`;
  const greeting = name ? `Olá, ${name.split(' ')[0]}!` : 'Olá!';
  const text = `${greeting}\n\n${t.body}\n\n${link}\n\n— LALA Bridge`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const html = `<p>${esc(greeting)}</p><p>${esc(t.body)}</p><p><a href="${esc(link)}">Abrir meu painel</a></p><p>— LALA Bridge</p>`;
  return { subject: t.subject, text, html };
}
