# LALA Bridge: plano de ação para o AI4Good 2027

> Documento de handoff para o Claude Code. Leia inteiro antes de começar e siga as fases na ordem.
> Repositório: https://github.com/ExeWall/lala-bridge
> Autor do projeto: Wallyson Silva (UFPE, alumni da LALA)

---

## 1. Contexto

### 1.1 O que é o projeto
O LALA Bridge é uma plataforma web open source (licença MIT) que conecta **doadores** de equipamentos (notebooks, celulares, fones, monitores, periféricos e livros) a **Lalíderes**, jovens verificados da Latin American Leadership Academy que precisam desses equipamentos para estudar e trabalhar.

### 1.2 Por que este plano existe
O projeto foi inscrito no **Programa AI4Good da Brazil Conference 2027** (Harvard e MIT). O tema da edição é **"IA que aproxima: unindo pessoas, eliminando barreiras e fortalecendo o pertencimento da sociedade brasileira"**. O programa exige:
- código **open source**;
- uso real e central de **inteligência artificial**;
- foco em **problemas brasileiros**, alinhado aos ODS 4, 10, 12 e 17;
- solução **implementável**, e não apenas uma prova de conceito.

Na inscrição, o projeto foi apresentado assim: um MVP funcional que vai evoluir para o contexto brasileiro, com IA em quatro frentes:
1. **Pedido em linguagem natural**, acessível pelo celular: o jovem descreve em texto ou áudio o que precisa e a IA estrutura o pedido.
2. **Triagem de doações por foto**: a visão computacional estima tipo, estado e especificações do equipamento.
3. **Matching inteligente** entre necessidade e doação, considerando uso pretendido, requisitos, urgência e localização.
4. **Confiança e transparência**: sinalização de cadastros e pedidos suspeitos e relatórios de impacto para o doador.

Tudo deve respeitar a LGPD e ter revisão humana nas decisões sensíveis. O piloto começa com a rede LALA no Brasil e depois se abre a escolas públicas e ONGs.

**Dado de base usado na inscrição** (TIC Domicílios 2025, Cetic.br): 65% dos usuários de internet no Brasil acessam só pelo celular. Por isso, a experiência precisa ser **mobile-first**.

### 1.3 Cronograma do programa (orienta as prioridades)
| Data | Etapa | O que precisa estar pronto |
|---|---|---|
| 13 a 15/11/2026 | Entrevista | Fase 1 deste plano, se possível, para mostrar evolução |
| 17/11 a 04/12/2026 | Aceleração (mentoria semanal) | Fases 2 a 4 |
| **05/12/2026** | **Demo Day** | Demo ponta a ponta com IA funcionando (ver seção 6) |

---

## 2. Estado atual do repositório (diagnóstico)

### 2.1 Stack e estrutura
- HTML, CSS e JavaScript puros, sem build e sem dependências. Para rodar, basta abrir o `index.html`.
- Persistência 100% em `localStorage`. Os dados ficam apenas no navegador de cada usuário.
- Páginas: `index`, `register`, `login`, `dashboard`, `donate` e `browse`.
- JS: `app.js` (UI, toasts, modais e cards), `auth.js`, `donations.js` e `mock-data.js` (o "banco" simulado).
- Um único commit (`25c63de`, redesign de UI). Não há testes, CI, `package.json` nem arquivo `LICENSE`. O README cita MIT, mas o arquivo da licença não existe.
- Toda a interface está em **inglês**, e os dados de exemplo são de outros países da América Latina e dos EUA.

### 2.2 Bugs e lacunas funcionais (por ordem de gravidade)
1. **O fluxo central de doação não funciona.** `App.confirmMatch()` (em `js/app.js`) só mostra um toast. Nenhum dado é salvo, e `Donations.match()` nunca é chamado em lugar nenhum. As necessidades (*needs*) nunca saem do status `open`, e o Lalíder não é avisado de nada.
2. **O Lalíder não consegue pedir uma doação específica.** `renderDonationCard` não tem nenhum botão de ação.
3. **Não há controle de papel em `donate.html`.** Qualquer usuário logado, inclusive um Lalíder, pode publicar doações. Isso contradiz o README, que diz que só doadores doam.
4. **O pedido criado no cadastro tem categoria fixa.** Em `register.html` (por volta da linha 330), todo pedido feito no cadastro recebe `category: 'laptop'` e o título genérico "Equipment needed for studies".
5. **`markCodeAsUsed` só altera o array em memória**, que volta ao estado original a cada recarga. Hoje a proteção vem apenas da checagem em `users`, e a função é enganosa.
6. **`verifyLaliderCode` ignora o nome.** Há um comentário admitindo que o nome deveria ser validado.
7. **IDs inconsistentes.** Necessidades usam `laliderId = verificationCode`, enquanto o resto do sistema usa `user.id`. `matchedTo` mistura os dois formatos (veja `don-003`, com `matchedTo: "LALA-VLB32-003"`).
8. O formulário de pedido do dashboard fica dentro de um modal com `onclick` em string. Funciona, mas é frágil.
9. O campo `showerSong` ("música de chuveiro") aparece no dashboard. Para um produto que lida com doadores corporativos, vale reavaliar se ele deve continuar.

### 2.3 Segurança e privacidade (crítico antes de qualquer uso real)
1. **XSS armazenado.** Título, descrição, nome e organização vindos do usuário são interpolados direto em `innerHTML`, em `App.renderDonationCard`, `App.renderNeedCard`, `App.showToast`, `App.showModal`, no `dashboard.html` e no `register.html` (`result.message`).
2. **Senhas em texto puro** no `localStorage`.
3. **A sessão não tem integridade.** Qualquer pessoa pode editar `lala_bridge_session` no DevTools e virar outro usuário ou mudar de papel.
4. **Os códigos de verificação válidos ficam públicos** no `mock-data.js` e no README.
5. Não há consentimento LGPD, política de privacidade nem forma de excluir a conta.
6. Os dados de jovens, potencialmente menores ou vulneráveis, ficam expostos, com nome, país e turma no card público.

### 2.4 Qualidade e UX
- Não há i18n. O público brasileiro precisa da interface em **PT-BR**.
- A acessibilidade não foi auditada: labels, foco, contraste do tema escuro "glassmorphism", `aria-*` e navegação por teclado.
- Os breakpoints existem (1024, 768 e 480px), mas o fluxo principal precisa ser testado em celular de entrada.
- As doações não têm imagens (`image: null` sempre).
- Não há página de detalhe, nem para a doação, nem para o pedido.

---

## 3. Princípios e regras para o Claude Code

1. **Uma fase por branch** (`fase-1-correcoes`, `fase-2-ptbr`...) e **commits pequenos** no padrão Conventional Commits (`fix:`, `feat:`, `chore:`, `docs:`, `test:`).
2. **Não commitar segredos.** Chaves de API vão em `.env`, que já está no `.gitignore`. Crie um `.env.example`.
3. **Pergunte ao autor antes de** trocar a stack, apagar funcionalidades, mudar a identidade visual ou contratar ou escolher um provedor pago.
4. **Mantenha o projeto fácil de rodar** para contribuidores: no máximo `npm install && npm run dev`.
5. **A IA sempre tem fallback.** Se a API de IA falhar, o fluxo manual precisa continuar funcionando.
6. **Humano no circuito.** A IA sugere e a pessoa confirma: o doador confirma as specs, o admin decide sobre suspeitas de fraude e nada é banido automaticamente.
7. **Privacidade por padrão.** Envie à IA o mínimo de dados pessoais possível (nunca e-mail, telefone ou nome completo).
8. Ao terminar cada fase, atualize o README e o checklist da seção 7.

---

## 4. Plano de ação por fase

### FASE 1: Fundação, correções e segurança básica (antes de 15/11)
Objetivo: o MVP atual fica seguro de demonstrar e o fluxo principal funciona de ponta a ponta, ainda com `localStorage`.

**1.1 Infraestrutura do repositório**
- [x] Adicionar o arquivo `LICENSE` (MIT, titular Wallyson Silva e contribuidores da comunidade LALA).
- [x] Criar o `package.json` com scripts `dev` (servidor estático, por exemplo `vite` ou `serve`), `lint` (ESLint), `format` (Prettier) e `test` (Vitest com jsdom).
- [x] Criar `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` e os templates de issue e PR em `.github/`.
- [x] Configurar o GitHub Actions: lint e testes em cada PR.

**1.2 Segurança**
- [x] Criar a função `escapeHTML()` em `app.js` e aplicá-la em **todo** dado de usuário renderizado via `innerHTML`, ou trocar por `textContent` e `createElement`. Cobrir com testes que injetam `<img src=x onerror=alert(1)>`.
- [x] Trocar os `onclick="..."` em string dos modais e cards por `addEventListener` com `data-*`.
- [x] Fazer hash das senhas com `crypto.subtle` (SHA-256 com salt), como paliativo até a Fase 3. Documentar no código que isso **não** é segurança de produção.
- [x] Tirar os códigos de verificação de demo do README e criar um "modo demo" explícito (botão "Entrar como demo") que só existe com uma flag `DEMO_MODE`.

**1.3 Correções funcionais**
- [x] **Implementar o fluxo de match de verdade:**
  - Criar a entidade `offer` (oferta) com `{ id, needId, donationId?, donorId, laliderId, status: 'pending'|'accepted'|'declined'|'delivered', createdAt, updatedAt }`.
  - Doador → "Oferecer ajuda" em um pedido gera uma `offer` pendente.
  - Lalíder → "Solicitar" em uma doação gera uma `offer` pendente no sentido inverso.
  - O dashboard de cada lado lista as ofertas recebidas, com os botões Aceitar e Recusar.
  - Quando a oferta é aceita, a doação vira `matched` e o pedido vira `matched`. Só então os contatos são revelados às duas partes.
  - "Marcar como entregue" faz a doação e o pedido virarem `delivered`.
- [x] Padronizar IDs: usar sempre `user.id` em `laliderId` e `matchedTo`, e escrever uma migração simples dos dados antigos do `localStorage`.
- [x] Bloquear `donate.html` para quem não é doador e o formulário de pedido para quem não é Lalíder.
- [x] Fazer o pedido criado no cadastro pedir a categoria em vez de fixar `laptop`.
- [x] Remover `markCodeAsUsed` ou persistir o uso do código corretamente.
- [x] Validar o nome informado contra o nome registrado do código, com comparação tolerante a acentos e caixa.

**1.4 Testes**
- [x] Testes unitários para `Auth`, `Donations`, ofertas, filtros e `escapeHTML`.

**Critério de pronto:** um doador oferece, o Lalíder aceita, os contatos aparecem e o pedido fica "entregue", sem erro no console e com os testes passando no CI.

---

### FASE 2: Brasil, idioma e acessibilidade (até cerca de 20/11)
Objetivo: o produto parece feito para o Brasil e funciona bem no celular.

- [ ] **i18n** com um dicionário simples (`js/i18n.js` e `locales/pt-BR.json`, `en.json`, `es.json`). **PT-BR é o padrão**, com seletor de idioma no navbar e todos os textos fixos externalizados.
- [ ] Datas e números com `Intl` no locale ativo. Hoje `formatDate` usa `en-US` fixo.
- [ ] Localização brasileira: campo **UF e cidade** quando o país for Brasil, para alimentar o matching por proximidade.
- [ ] Dados de exemplo brasileiros (jovens fictícios em PE, BA, SP e AM, e doadores empresariais fictícios).
- [ ] **LGPD:** página `privacidade.html`, checkbox de consentimento no cadastro, botão "Excluir minha conta e meus dados" e, nos cards públicos, só o primeiro nome com a inicial, UF e turma.
- [ ] **Acessibilidade (WCAG 2.1 AA):** labels associados, `aria-live` nos toasts, foco preso no modal e fechamento com Esc, contraste verificado e tudo navegável por teclado.
- [ ] **Mobile-first:** testar o fluxo inteiro em 360px de largura e garantir alvos de toque de pelo menos 44px.
- [ ] Rever o campo `showerSong` (sugestão: trocar por "Conte um pouco sobre você" ou remover). **Pergunte ao autor.**

**Critério de pronto:** Lighthouse com acessibilidade ≥ 90 e performance ≥ 85 no mobile, e o fluxo completo em PT-BR em um celular.

---

### FASE 3: Backend real com Supabase (até cerca de 27/11)
Objetivo: sair do `localStorage` para ter dados compartilhados, autenticação real e armazenamento de fotos. **Confirme a escolha do Supabase com o autor antes de começar.** É open source, tem plano gratuito, Postgres, Auth, Storage, Edge Functions e `pgvector`.

- [ ] Migrar para **Vite** (sem framework), com módulos ES, para suportar variáveis de ambiente e o SDK. A identidade visual atual se mantém.
- [ ] **Esquema** (as migrações SQL ficam em `supabase/migrations/`):
  - `profiles` (id = auth.uid, role `donor|lalider|admin`, nome, UF, cidade, turma, verificado, consentimento_em)
  - `verification_codes` (code, nome_registrado, turma, usado_por, usado_em), acessível só pelo servidor
  - `donations` (doador, categoria, título, descrição, estado, specs jsonb, fotos[], UF, cidade, status, embedding vector)
  - `needs` (Lalíder, categoria, título, descrição, uso_pretendido, requisitos jsonb, urgência, status, embedding vector)
  - `offers` (como na Fase 1)
  - `impact_updates` (offer_id, texto, foto opcional, criado_em)
  - `flags` (entidade, motivo, score, status de revisão)
- [ ] **RLS (Row Level Security)** em todas as tabelas: cada usuário só edita o que é seu, contatos só ficam visíveis depois de uma oferta aceita e o papel é verificado no servidor.
- [ ] **Supabase Auth** (e-mail com magic link ou senha). A verificação do código LALA vira uma Edge Function.
- [ ] Upload de fotos das doações no Storage, com compressão no cliente.
- [ ] Notificações por e-mail para nova oferta, oferta aceita e entrega confirmada.
- [ ] **Deploy** em Vercel, Netlify ou Cloudflare Pages, com URL pública no README.
- [ ] Painel `admin.html` mínimo: revisar flags, ver métricas e gerenciar códigos.

**Critério de pronto:** dois navegadores diferentes veem os mesmos dados, a sessão não pode ser forjada pelo DevTools e a app está publicada.

---

### FASE 4: Inteligência artificial (até 04/12, núcleo do AI4Good)
Arquitetura: **todas as chamadas de IA passam por Edge Functions** e a chave nunca vai para o front. Crie uma camada `ai/provider.ts` com interface única (`chat`, `vision`, `embed`) e implementação configurável por `.env`, de preferência compatível com a API da OpenAI, para poder trocar entre modelos abertos e comerciais. **Pergunte ao autor qual provedor e orçamento usar.** Registre o custo e o uso por chamada e defina um limite diário.

**4.1 Assistente de pedido em linguagem natural (prioridade 1)**
- [ ] Na tela "Novo pedido", um campo livre para escrever ou **gravar áudio** (MediaRecorder, transcrito por um modelo de fala para texto).
- [ ] A Edge Function `structure-need` recebe o texto e devolve JSON validado (zod ou JSON Schema): `{ categoria, titulo, uso_pretendido, requisitos_minimos: { ram_gb?, armazenamento_gb?, so?, camera? }, urgencia_sugerida, justificativa }`.
- [ ] O formulário vem pré-preenchido e o jovem revisa e edita antes de publicar.
- [ ] O prompt fica em `ai/prompts/structure-need.md`, versionado, em PT-BR, com exemplos.
- [ ] Fallback: se a IA falhar, aparece o formulário manual normal.

**4.2 Triagem de doações por foto (prioridade 2)**
- [ ] O doador envia de 1 a 3 fotos e a Edge Function `analyze-donation` usa um modelo de visão para sugerir `{ categoria, marca_modelo_provavel, estado_estimado, specs_visiveis, usos_recomendados[] }`.
- [ ] O doador confirma ou corrige. As specs confirmadas viram `donations.specs`.
- [ ] Aviso visível de que a sugestão é automática e pode errar.

**4.3 Matching inteligente (prioridade 1)**
- [ ] **Base (regras, explicável):** score de 0 a 100 combinando categoria compatível (filtro), specs ≥ requisitos mínimos, urgência, mesma UF ou distância e tempo de espera do pedido (para não deixar ninguém esquecido).
- [ ] **Semântica:** gerar embeddings de `needs` e `donations` (`uso_pretendido` + descrição) em `pgvector` e somar a similaridade de cosseno ao score.
- [ ] Mostrar o **"Por que este match?"** com os 2 ou 3 fatores principais em linguagem simples.
- [ ] No dashboard do doador: "Pedidos que sua doação pode atender". No dashboard do Lalíder: "Doações recomendadas para você".
- [ ] Fazer uma checagem simples de justiça: medir se o matching favorece sistematicamente alguma UF e documentar o resultado.

**4.4 Confiança: detecção de suspeitas (prioridade 3)**
- [ ] Heurísticas, com IA opcional: textos quase idênticos entre pedidos diferentes (similaridade de embedding), muitos pedidos em pouco tempo, muitas contas por dispositivo ou IP e doações com padrão de golpe.
- [ ] Gerar `flags` para **revisão humana** no painel admin. Nunca bloquear automaticamente.

**4.5 Relatórios de impacto (prioridade 3)**
- [ ] Depois da entrega, o jovem posta uma atualização curta (texto, foto opcional).
- [ ] A IA gera um resumo amigável para o doador e um resumo agregado na home: equipamentos entregues, UFs alcançadas e quilos de lixo eletrônico evitados (com estimativa documentada).

**Critério de pronto:** pedido por áudio → pedido estruturado → recomendação de doação com explicação → oferta aceita → entrega → relatório, tudo funcionando na URL pública.

---

### FASE 5: Preparação do Demo Day (até 05/12)
- [ ] Popular o ambiente com dados fictícios realistas (sem pessoas reais).
- [ ] Escrever o roteiro de demo de 3 minutos em `docs/demo-script.md` (ver seção 6).
- [ ] Gravar um vídeo de backup da demo, caso a internet falhe no dia.
- [ ] Atualizar o README em PT-BR (com seção EN): problema com os dados da TIC, arquitetura com diagrama, como a IA é usada, LGPD e limitações, como rodar, como contribuir e roadmap.
- [ ] Criar `docs/arquitetura.md` e `docs/ia-responsavel.md` (dados enviados à IA, riscos, mitigações e revisão humana).
- [ ] Criar uma página `/impacto` com as métricas.

---

## 5. Itens fora do escopo até o Demo Day (roadmap futuro)
- PWA ou app offline, e integração com WhatsApp Business API (o assistente via WhatsApp fica como próximo passo).
- Abertura para escolas públicas e ONGs, com novo tipo de verificação institucional.
- Logística de entrega (parcerias com Correios ou transportadoras) e ponte com Centros de Recondicionamento de Computadores (programa Computadores para Inclusão, do MCom).
- Doações corporativas em lote (upload de planilha de ativos).

---

## 6. Roteiro sugerido da demo (3 min)
1. **Problema (20s):** "65% dos brasileiros conectados acessam a internet só pelo celular." Mostrar um jovem tentando estudar pelo celular.
2. **Pedido por voz (40s):** a Ana, de Recife, grava "preciso de um notebook pra fazer curso de Python e mandar currículo". A IA estrutura o pedido com categoria, requisitos e urgência.
3. **Doação por foto (40s):** uma empresa fotografa um notebook e a IA identifica o modelo, o estado e os usos recomendados.
4. **Match explicado (40s):** o sistema recomenda o notebook para a Ana e explica o motivo: atende 8GB de RAM, mesma região e pedido urgente.
5. **Confiança e impacto (30s):** a oferta é aceita, a entrega é confirmada e o doador recebe o relatório. O painel mostra o impacto agregado.
6. **Fechamento (10s):** é open source e qualquer ONG pode usar.

---

## 7. Checklist de progresso
- [x] Fase 1: Fundação, correções e segurança (branch `fase-1-correcoes`)
- [ ] Fase 2: Brasil, PT-BR, LGPD e acessibilidade
- [ ] Fase 3: Backend Supabase e deploy
- [ ] Fase 4.1: Assistente de pedido
- [ ] Fase 4.2: Triagem por foto
- [ ] Fase 4.3: Matching inteligente
- [ ] Fase 4.4: Detecção de suspeitas
- [ ] Fase 4.5: Relatórios de impacto
- [ ] Fase 5: Demo Day

## 8. Decisões que dependem do autor (pergunte antes)
1. Usar Supabase como backend (recomendado) ou outro.
2. Qual provedor e modelo de IA usar, e qual o orçamento mensal.
3. Remover ou substituir o campo `showerSong`.
4. Manter o nome "LALA Bridge" e o foco na LALA no piloto, ou abrir para outros jovens desde já.
5. Domínio e plataforma de deploy.
