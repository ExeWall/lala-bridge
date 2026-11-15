# 🌉 LALA Bridge

**Conectamos doadores de equipamentos a jovens Lalíderes, com inteligência artificial que aproxima e uma pessoa sempre no comando.**

O LALA Bridge é uma plataforma open source (MIT) que liga quem tem notebooks, celulares, fones, monitores e livros para doar a Lalíderes verificados da [Latin American Leadership Academy](https://latinamericanleadershipacademy.org) que precisam desses equipamentos para estudar e trabalhar. O piloto começa com a rede LALA no Brasil.

> _English summary [below](#english)._

## O problema

No Brasil, **65% das pessoas que usam a internet acessam só pelo celular** (TIC Domicílios 2025, Cetic.br). Estudar programação, fazer um curso online ou montar um currículo assim é muito difícil. Ao mesmo tempo, empresas e pessoas têm equipamentos parados que poderiam mudar a trajetória de um jovem, e que muitas vezes viram lixo eletrônico.

## Como funciona

1. **O Lalíder pede com as próprias palavras**, escrevendo ou gravando um áudio. A IA organiza o pedido (categoria, uso, requisitos mínimos, urgência) e ele revisa antes de publicar.
2. **O doador publica com fotos.** A IA sugere categoria, modelo, estado e configurações; o doador confirma ou corrige.
3. **Matching explicável:** o sistema recomenda as melhores combinações e mostra o motivo ("Atende 8 GB de RAM · Pedido urgente · Mesmo estado (PE)").
4. **Oferta → aceite → contato → entrega.** Os contatos só aparecem depois que a oferta é aceita.
5. **Impacto:** o jovem conta como a doação ajudou, o doador recebe um resumo, e `/impacto` mostra os números agregados.

## Como a IA é usada

| Frente                      | O que faz                                                                                               | Sem IA                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Pedido em linguagem natural | Texto ou áudio → pedido estruturado                                                                     | Regras por palavras-chave, ditado do navegador e formulário manual |
| Triagem por foto            | Fotos → categoria, modelo, estado, specs e usos recomendados                                            | Formulário (RAM e SSD do título preenchem as specs)                |
| Matching                    | Embeddings (pgvector) + regras explicáveis + equidade entre regiões                                     | Similaridade de texto local                                        |
| Confiança                   | Pedidos quase idênticos (embeddings) e regras de golpe, contato no texto, muitas contas por dispositivo | As mesmas regras, no navegador                                     |
| Impacto                     | Resumo do relato para o doador                                                                          | Modelo de texto que cita o relato                                  |

Princípios: **a IA sugere e uma pessoa decide**, **nada é bloqueado automaticamente**, **dados pessoais não vão para a IA**, e **todo fluxo funciona sem IA**. Detalhes em [`docs/ia-responsavel.md`](docs/ia-responsavel.md), checagem de justiça do matching em [`docs/matching-justica.md`](docs/matching-justica.md).

## LGPD e acessibilidade

- Política de Privacidade ([`privacidade.html`](privacidade.html)), consentimento no cadastro, "baixar meus dados" e "excluir minha conta" no painel.
- Telas públicas mostram só o primeiro nome com a inicial, a UF e a turma. Contatos só aparecem após o aceite.
- Interface em PT-BR (padrão), inglês e espanhol; WCAG 2.1 AA (teclado, leitores de tela, contraste); mobile-first testado em 360 px.

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Sem configuração, o app roda no **modo local**: dados fictícios ficam só no navegador, e o login tem botões "Entrar como demo" (Lalíder, doador e equipe). Para dados compartilhados, login real e IA, siga [`docs/supabase.md`](docs/supabase.md).

| Comando                           | O que faz                                                         |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                     | Servidor local (Vite)                                             |
| `npm test`                        | Testes do front-end (Vitest + jsdom)                              |
| `npm run test:db`                 | Testes do banco: migrações, RLS e funções (Postgres com pgvector) |
| `npm run test:functions`          | Testes e checagem de tipos das Edge Functions (Deno)              |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                 |
| `npm run build`                   | Gera `dist/` para o deploy                                        |
| `npm run seed:demo`               | Cria os dados fictícios no Supabase                               |
| `node scripts/fairness.js`        | Checagem de justiça do matching por região                        |

## Deploy

Site estático na **Vercel** (`vercel.json`): cada push na `master` vai para produção, e cada pull request ganha uma URL de prévia. Configure na Vercel as variáveis de [`.env.example`](.env.example) (só as públicas). Backend: [`docs/supabase.md`](docs/supabase.md).

## Arquitetura

Front-end em HTML, CSS e JavaScript sem framework, com dois backends atrás de uma interface única (`js/api.js`): **local** (navegador) e **Supabase** (Postgres com RLS, Auth, Storage, Edge Functions e pgvector). A IA roda só nas Edge Functions, com provedor compatível com a API da OpenAI configurado por variáveis de ambiente. Diagrama e detalhes: [`docs/arquitetura.md`](docs/arquitetura.md).

```
lala-bridge/
├── *.html                # Páginas (início, explorar, doar, painel, admin, impacto, privacidade…)
├── css/styles.css
├── locales/              # pt-BR.json, en.json, es.json
├── js/                   # Módulos do app (api, remote, matching, ai, trust…) e js/pages/
├── supabase/             # Migrações, seed, testes do banco e Edge Functions
├── ai/prompts/           # Prompts versionados (PT-BR)
├── scripts/              # build, env, test-db, seed-demo, fairness, record-demo
├── tests/                # Testes do front-end
└── docs/                 # Plano, arquitetura, IA responsável, Supabase, demo, impacto
```

## Limitações conhecidas

- No **modo local**, os dados ficam no navegador e o hash de senha é só um paliativo; use o modo Supabase com pessoas reais e `LALA_DEMO_MODE=false`.
- A IA de verdade exige escolher um provedor e configurar as chaves nas Edge Functions. Sem isso, entram as alternativas locais.
- O peso do lixo eletrônico evitado é uma estimativa ([`docs/impacto.md`](docs/impacto.md)).
- As fontes vêm do Google Fonts (o IP do visitante vai para o Google); hospedar as fontes no próprio site está no roadmap.

## Roadmap

- [x] Fluxo de match com ofertas, aceite, contatos e entrega (Fase 1)
- [x] PT-BR, LGPD, acessibilidade e mobile-first (Fase 2)
- [x] Backend Supabase com RLS, fotos, notificações e painel admin (Fase 3)
- [x] IA: pedido por texto ou voz, triagem por foto, matching explicável, confiança e impacto (Fase 4)
- [x] Roteiro e vídeo de backup do Demo Day (Fase 5)
- [ ] Assistente via WhatsApp
- [ ] Abertura para escolas públicas e ONGs (verificação institucional)
- [ ] Logística de entrega e ponte com Centros de Recondicionamento de Computadores
- [ ] Doações corporativas em lote

Plano completo: [`docs/PLANO_DE_ACAO.md`](docs/PLANO_DE_ACAO.md).

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md).

## Licença

[MIT](LICENSE) — use e adapte para causas parecidas.

---

## English

**LALA Bridge** is an open source (MIT) platform that connects people and companies donating laptops, phones and other study equipment with verified young leaders ("Lalíderes") from the Latin American Leadership Academy. The pilot starts in Brazil, where 65% of internet users go online only through their phones.

**AI with a human in the loop:** Lalíderes describe what they need in their own words (text or voice) and AI structures the request; donors upload photos and AI suggests category, condition and specs; an explainable matching (requirements, location, urgency, waiting time, semantic similarity via pgvector and a regional equity factor) recommends pairs and says why; trust signals go to human review (nothing is blocked automatically); and AI summarizes impact updates for donors. Every AI feature has a non-AI fallback, personal data is stripped before anything reaches the model, and users always review suggestions.

**Stack:** static HTML/CSS/JS (no framework), two interchangeable backends (browser-only demo mode and Supabase with Postgres RLS, Auth, Storage and Edge Functions), OpenAI-compatible AI provider configured through environment variables, deployed on Vercel. UI in Brazilian Portuguese, English and Spanish; WCAG 2.1 AA; LGPD-oriented privacy features.

**Run it:** `npm install && npm run dev` (demo mode, no configuration). Backend setup: [`docs/supabase.md`](docs/supabase.md). Responsible AI: [`docs/ia-responsavel.md`](docs/ia-responsavel.md).

Built with ❤️ by the LALA community.
