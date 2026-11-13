"""
Gera locales/pt-BR.json, en.json e es.json a partir das tabelas i18n-table-*.py.

Cada linha das tabelas é (chave, pt-BR, en, es). Manter as três traduções na
mesma linha evita que um idioma fique sem uma chave. Rode depois de editar:

    python3 scripts/build-locales.py
"""
import glob, json, os, runpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
rows, seen = [], set()
for path in sorted(glob.glob(os.path.join(HERE, 'i18n-table-*.py'))):
    for row in runpy.run_path(path)['T']:
        assert len(row) == 4, row
        assert row[0] not in seen, f'chave duplicada: {row[0]}'
        seen.add(row[0])
        rows.append(row)

for idx, code in [(1, 'pt-BR'), (2, 'en'), (3, 'es')]:
    tree = {}
    for row in rows:
        node = tree
        parts = row[0].split('.')
        for part in parts[:-1]:
            node = node.setdefault(part, {})
            assert isinstance(node, dict), f'conflito de chave em {row[0]}'
        assert parts[-1] not in node, f'conflito de chave em {row[0]}'
        node[parts[-1]] = row[idx]
    with open(os.path.join(ROOT, 'locales', f'{code}.json'), 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
        f.write('\n')
print(f'{len(rows)} chaves geradas em 3 idiomas')
