# Matching: como funciona e checagem de justiça

O matching só **ordena sugestões**. Quem decide oferecer, pedir e aceitar é sempre uma pessoa. Nenhum pedido é escondido: a lista completa de pedidos e doações continua em "Explorar".

## Score (0 a 100)

| Fator           | Peso | Regra                                                                                                                                                                          |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requisitos      | 35   | Specs da doação (confirmadas pelo doador ou lidas do título) ≥ requisitos mínimos do pedido. Se algum requisito conhecido não for atendido, o fator zera e a explicação avisa. |
| Localização     | 10   | Mesma UF (10), mesma região (6), mesmo país (3).                                                                                                                               |
| Urgência        | 15   | Alta (15), média (9), baixa (4).                                                                                                                                               |
| Tempo de espera | 15   | Dias com o pedido aberto, até 30, para ninguém ficar esquecido.                                                                                                                |
| Semântica       | 10   | Similaridade entre o uso pretendido do pedido e a descrição da doação: embeddings com pgvector quando o servidor tem IA; senão, similaridade de texto local.                   |
| Equidade        | 15   | Regiões com menor parcela de pedidos já atendidos sobem na lista.                                                                                                              |

Categoria diferente não gera match. "Por que este match?" mostra os 2 ou 3 fatores que mais pesaram, em linguagem simples. O código está em `js/matching.js`, com testes em `tests/matching.test.js`.

## Checagem de justiça por região

**Pergunta:** o matching favorece sistematicamente alguma região?

**Cenário** (`scripts/fairness.js`, reproduzível com semente fixa):

- 108 pedidos de notebook, 4 por UF, nas 27 UFs.
- 48 doações ao longo de 12 semanas (escassez: menos da metade dos pedidos é atendida), 70% vindas do Sudeste, como costuma ser a oferta de doadores empresariais.
- Cada doação vai para o pedido aberto de maior score, que é o primeiro sugerido no painel.

**Resultado (15/11/2026):**

| Região       | Pedidos | Atendidos (sem equidade) | Atendidos (com equidade) |
| ------------ | ------- | ------------------------ | ------------------------ |
| Norte        | 28      | 39%                      | 39%                      |
| Nordeste     | 36      | 50%                      | 44%                      |
| Centro-Oeste | 16      | 0%                       | 38%                      |
| Sudeste      | 16      | 81%                      | 56%                      |
| Sul          | 12      | 50%                      | 50%                      |

Total atendido: 48 e 48 de 108 pedidos. Diferença entre a região mais e a menos atendida: 81 pontos (sem) e 19 pontos (com equidade).

**O que aprendemos:**

1. A primeira versão do score (sem o fator de equidade, com localização valendo 20) **deixava o Centro-Oeste sem nenhum atendimento** e dava 81% ao Sudeste. A causa: as doações vinham do Sudeste, e a proximidade decidia o desempate.
2. O tempo de espera **não resolve isso sozinho**, porque todos os pedidos envelhecem no mesmo ritmo.
3. Com o fator de equidade (15) e a localização reduzida para 10, a diferença entre a região mais e a menos atendida caiu de 81 para 19 pontos, com o mesmo total atendido. Testamos também equidade 10 (diferença de 38 pontos) e 20 (19 pontos, sem ganho extra e com menos peso para a proximidade). Ficamos com 15.

**Limites:** é uma simulação com dados sintéticos e alocação gulosa. Proximidade ainda importa (a entrega é combinada entre as pessoas), então a equidade não zera a diferença. Com dados reais do piloto, esta checagem deve ser refeita mensalmente, olhando também o tempo até o atendimento por UF. Para rodar:

```bash
node scripts/fairness.js
```
