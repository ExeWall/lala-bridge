# Como ligar o LALA Bridge ao Supabase

Sem configuração, o app roda no **modo local**: os dados ficam só no navegador, o que é ótimo para demonstração offline. Para ter dados compartilhados, login real e fotos no servidor, siga os passos abaixo (cerca de 20 minutos).

## 1. Criar o projeto

1. Em [supabase.com](https://supabase.com), crie um projeto (plano gratuito). Escolha a região **South America (São Paulo)**.
2. Em **Project Settings → API**, anote a **Project URL**, a chave **anon public** e a chave **service_role** (secreta).

## 2. Criar o banco

Opção A, pelo navegador: em **SQL Editor**, rode, nesta ordem, cada arquivo de `supabase/migrations/`.

Opção B, pela CLI do Supabase:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Só para demonstração, rode também `supabase/seed.sql` (códigos de verificação fictícios). Em produção, cadastre os códigos reais da LALA no painel admin.

## 3. Autenticação

Em **Authentication → URL Configuration**, coloque a URL da Vercel (ex.: `https://lala-bridge.vercel.app`) em **Site URL**.

A confirmação de e-mail vem ligada: a pessoa recebe um link antes do primeiro login, e o app já trata isso. Para a demonstração, você pode desligar em **Authentication → Providers → Email → Confirm email**.

## 4. Variáveis na Vercel

Em **Vercel → Project → Settings → Environment Variables**:

| Variável             | Valor                                                |
| -------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`       | Project URL                                          |
| `SUPABASE_ANON_KEY`  | chave anon public (protegida pelas regras de RLS)    |
| `LALA_DEMO_MODE`     | `true` na demonstração; `false` com pessoas reais    |
| `LALA_DEMO_PASSWORD` | senha das contas fictícias de demonstração (passo 6) |

**Nunca** coloque a chave `service_role` na Vercel nem no front-end. Depois de salvar, faça um novo deploy.

## 5. Edge Functions (notificações e IA)

```bash
npx supabase functions deploy notify
npx supabase secrets set WEBHOOK_SECRET=um-segredo-longo APP_URL=https://lala-bridge.vercel.app
# opcional, para e-mails:
npx supabase secrets set RESEND_API_KEY=... NOTIFY_FROM="LALA Bridge <avisos@seudominio.org>"
```

Em **Database → Webhooks**, crie um webhook na tabela `offers` (eventos Insert e Update), do tipo **Supabase Edge Function** → `notify`, com o cabeçalho `x-webhook-secret` igual ao `WEBHOOK_SECRET`.

As funções de IA e os segredos delas estão em [`docs/ia-responsavel.md`](ia-responsavel.md).

## 6. Dados de demonstração (opcional)

No seu computador, com o `.env` preenchido (inclusive `SUPABASE_SERVICE_ROLE_KEY`):

```bash
npm run seed:demo
```

Isso cria as contas fictícias (Ana, Instituto Ponte Digital, equipe admin...), com a senha `LALA_DEMO_PASSWORD`, além das doações e pedidos de exemplo.

## 7. Primeiro admin real

Crie sua conta pelo site (como doador) e, no **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
```

## Como as regras protegem os dados

- RLS em todas as tabelas: cada pessoa só altera o que é seu, e só as colunas permitidas.
- Papel, verificação e status de doações, pedidos e ofertas só mudam pelas funções do servidor (`offer_help`, `respond_offer`, `mark_delivered`...).
- E-mail e nome completo da outra parte só aparecem pela função `get_offer_contact`, depois de uma oferta aceita.
- Os testes das regras estão em `supabase/tests/` e rodam com `npm run test:db` (Postgres com pgvector).
