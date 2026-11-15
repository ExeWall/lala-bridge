# IA responsável no LALA Bridge

A IA **sugere** e uma **pessoa decide**. Nenhuma decisão sobre alguém é tomada automaticamente, e todo fluxo funciona sem IA.

## Onde a IA é usada

| Função             | O que faz                                                         | Dados enviados à IA                                                             | Quem confirma                                                                   | Sem IA                                                        |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `structure-need`   | Organiza o pedido escrito ou falado                               | Só o texto do pedido, sem e-mails, telefones, CPFs e links                      | O Lalíder edita o formulário antes de publicar                                  | Regras por palavras-chave (`LocalAI`) e formulário manual     |
| `transcribe`       | Transforma o áudio (até 1 min) em texto                           | O áudio; ele não é guardado                                                     | O Lalíder revisa o texto                                                        | Ditado do navegador ou digitação                              |
| `analyze-donation` | Sugere categoria, modelo, estado, specs e usos a partir das fotos | Até 3 fotos reduzidas (768 px) e o título                                       | O doador confirma ou corrige; o aviso "pode errar" e a confiança ficam visíveis | Formulário manual (RAM e SSD do título já preenchem as specs) |
| `embed`            | Gera embeddings para o matching e para achar pedidos duplicados   | Título, uso pretendido e descrição, sem dados pessoais                          | Matching só ordena; duplicados viram sinalização                                | Similaridade de texto local                                   |
| `impact-summary`   | Resume para o doador o relato do Lalíder                          | O relato (sem dados pessoais), o primeiro nome com a inicial e o título do item | Resumo curto, sem inventar fatos; o relato original aparece junto               | Modelo de texto que cita o relato                             |

O que **nunca** vai para a IA: e-mail, telefone, nome completo, cidade, código de verificação e senha. O texto passa por `redactPII` antes do envio.

## Provedor e custos

- A camada `supabase/functions/_shared/ai/provider.ts` fala com qualquer API compatível com a da OpenAI (OpenAI, Groq, OpenRouter, Together, ou um modelo aberto local via Ollama). Trocar de provedor é só mudar variáveis de ambiente.
- A chave fica só nas Edge Functions (`supabase secrets set`), nunca no navegador.
- Cada chamada é registrada em `ai_usage` (função, modelo, tokens, custo estimado e sucesso) e aparece no painel admin.
- `AI_DAILY_LIMIT` limita as chamadas por dia. Ao atingir, o app avisa e segue pelo formulário manual.

Configuração:

```bash
npx supabase secrets set AI_BASE_URL=https://api.openai.com/v1 AI_API_KEY=... \
  AI_CHAT_MODEL=gpt-4o-mini AI_VISION_MODEL=gpt-4o-mini \
  AI_EMBED_MODEL=text-embedding-3-small AI_STT_MODEL=whisper-1 \
  AI_DAILY_LIMIT=300 AI_PRICE_INPUT_PER_MTOK=0.15 AI_PRICE_OUTPUT_PER_MTOK=0.60
npx supabase functions deploy structure-need transcribe analyze-donation embed impact-summary
```

Os modelos e preços acima são só exemplos. Escolha o provedor e o orçamento antes do piloto e confira os preços atuais.

## Riscos e mitigações

| Risco                                | Mitigação                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| IA inventa specs ou requisitos       | Respostas validadas (`normalize.ts`); campos sempre editáveis; aviso visível; specs confirmadas pelo doador têm prioridade no matching           |
| Viés regional no matching            | Checagem de justiça ([`matching-justica.md`](matching-justica.md)) e fator de equidade; o matching só ordena e a lista completa continua visível |
| Exposição de dados de jovens         | Envio mínimo, `redactPII`, nada de dados pessoais nos prompts; fotos de impacto em bucket privado                                                |
| Falsos positivos de fraude           | Sinalizações só vão para revisão humana no painel admin; nada é bloqueado ou banido automaticamente                                              |
| Indisponibilidade ou custo           | Alternativa local para cada função; limite diário; registro de custo                                                                             |
| Prompt injection no texto do usuário | Saída em JSON validada e normalizada para valores permitidos; o modelo não executa ações                                                         |

## Revisão humana

- **Lalíder:** revisa o pedido estruturado antes de publicar.
- **Doador:** confirma as specs sugeridas pela foto.
- **Quem recebe a oferta:** aceita ou recusa; o matching nunca liga pessoas sozinho.
- **Equipe (admin):** revisa as sinalizações e marca "falso alarme" ou "confirmar problema".
