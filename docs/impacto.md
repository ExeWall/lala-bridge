# Como calculamos o impacto

Os números da página `/impacto` e da página inicial são agregados e não têm dados pessoais.

- **Equipamentos entregues:** doações com status "entregue" (entrega confirmada por uma das partes).
- **Estados alcançados:** UFs dos pedidos atendidos por entregas confirmadas.
- **Lixo eletrônico evitado (estimado):** soma de um peso médio aproximado por tipo de equipamento entregue. É uma estimativa para dar ordem de grandeza, não uma medição. Os valores estão em `MockDB.categoryWeightsKg` (front-end) e em `category_weight_kg` (banco):

| Tipo             | Peso usado                        |
| ---------------- | --------------------------------- |
| Notebook         | 2,0 kg                            |
| Celular / tablet | 0,2 kg                            |
| Fone / áudio     | 0,3 kg                            |
| Monitor          | 4,0 kg                            |
| Periféricos      | 0,5 kg                            |
| Outros           | 1,0 kg                            |
| Livros           | não conta (não é lixo eletrônico) |

Para revisar os pesos, altere os dois lugares e este documento juntos.
