// Edge Function "notify": recebe o Database Webhook da tabela offers e envia
// e-mails (via Resend) para quem precisa agir. Se RESEND_API_KEY não estiver
// configurada, só registra no log: o app funciona do mesmo jeito, porque as
// ofertas também aparecem no painel e no contador do navbar.
//
// Segredos: WEBHOOK_SECRET (o mesmo configurado no webhook), RESEND_API_KEY,
// NOTIFY_FROM (ex.: "LALA Bridge <avisos@seudominio.org>") e APP_URL.
import { adminClient } from '../_shared/supabase.ts';
import { handleError, json } from '../_shared/http.ts';
import { decideNotifications, renderEmail, type WebhookPayload } from '../_shared/notify-logic.ts';

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('WEBHOOK_SECRET');
    if (!secret || req.headers.get('x-webhook-secret') !== secret) {
      return json({ error: 'unauthorized' }, 401);
    }
    const payload = (await req.json()) as WebhookPayload;
    const notifications = decideNotifications(payload);
    if (!notifications.length) return json({ sent: 0 });

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('NOTIFY_FROM');
    const appUrl = Deno.env.get('APP_URL') ?? '';
    if (!apiKey || !from) {
      console.log('notify: e-mail não configurado; eventos:', notifications.map((n) => n.event));
      return json({ sent: 0, skipped: notifications.length });
    }

    const db = adminClient();
    let sent = 0;
    for (const n of notifications) {
      const { data: profile } = await db.from('profiles').select('email, full_name').eq('id', n.to).maybeSingle();
      if (!profile?.email) continue;
      const email = renderEmail(n.event, profile.full_name, appUrl);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: profile.email, ...email }),
      });
      if (res.ok) sent++;
      else console.error('notify: falha no envio', res.status, await res.text());
    }
    return json({ sent });
  } catch (err) {
    return handleError(err);
  }
});
