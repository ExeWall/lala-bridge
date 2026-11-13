# Como contribuir com o LALA Bridge

Obrigado pelo interesse! O LALA Bridge é um projeto open source (MIT) feito pela comunidade LALA para conectar doadores de equipamentos a jovens Lalíderes. Toda contribuição é bem-vinda: código, design, textos, testes, traduções e relatos de bugs.

> _English speakers:_ contributions in English are welcome too. Issues and PRs can be written in Portuguese, Spanish or English.

## Antes de começar

- Leia o [Código de Conduta](CODE_OF_CONDUCT.md).
- Veja o plano do projeto em [`docs/PLANO_DE_ACAO.md`](docs/PLANO_DE_ACAO.md) e as issues abertas.
- Para mudanças grandes (stack, identidade visual, remoção de funcionalidades), abra uma issue antes para discutir.

## Rodando localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Outros comandos:

| Comando                | O que faz                             |
| ---------------------- | ------------------------------------- |
| `npm test`             | Roda os testes (Vitest + jsdom)       |
| `npm run lint`         | Verifica o código com ESLint          |
| `npm run format`       | Formata o código com Prettier         |
| `npm run format:check` | Confere a formatação sem alterar nada |

## Fluxo de trabalho

1. Crie uma branch a partir da `master` com um nome descritivo (`fix/escape-toast`, `feat/ofertas`).
2. Faça **commits pequenos** no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `style:`, `ci:`.
3. Garanta que `npm run lint`, `npm run format:check` e `npm test` passam.
4. Abra um Pull Request preenchendo o template.

## Textos e traduções

A interface é em PT-BR por padrão, com inglês e espanhol. Nenhum texto fica fixo no código:

- No HTML, escreva o texto em PT-BR e marque com `data-i18n="chave"` (ou `data-i18n-attr="placeholder:chave"` para atributos).
- No JS, use `I18n.t('chave', { parametro })`.
- Adicione a chave nos três arquivos de `locales/`. O `npm test` falha se faltar uma chave em algum idioma.

## Acessibilidade e celular

- Todo campo precisa de `<label for>` (ou `aria-label`), e todo botão precisa de texto ou `aria-label`. Os testes verificam isso.
- Teste em 360px de largura: nada pode ficar mais largo que a tela, e os alvos de toque precisam ter pelo menos 44px.

## Regras importantes

- **Nunca commite segredos.** Chaves de API vão no `.env` (que está no `.gitignore`). Use o `.env.example` como referência.
- **Escape todo dado vindo do usuário** antes de inserir no HTML (`App.escapeHTML`) ou use `textContent`.
- **Não use `onclick="..."` em string.** Use `data-action` e o roteador de ações do `App` ou `addEventListener`.
- **Privacidade por padrão:** não exponha e-mail, telefone ou nome completo de Lalíderes em telas públicas.
- **IA com humano no circuito:** a IA sugere e uma pessoa confirma. Toda funcionalidade de IA precisa de um fluxo manual de fallback.

## Reportando vulnerabilidades

Não abra issue pública para falhas de segurança. Use a aba **Security → Report a vulnerability** do repositório no GitHub.
