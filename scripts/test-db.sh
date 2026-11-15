#!/usr/bin/env bash
# Testa as migrações do Supabase num Postgres comum (com pgvector e unaccent).
#
# Uso: npm run test:db
# Conexão pelas variáveis padrão do psql (PGHOST, PGPORT, PGUSER, PGPASSWORD).
# Cria um banco descartável, aplica o stub do Supabase (supabase/tests/00_*),
# as migrações, o seed e roda os testes supabase/tests/*.test.sql.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB_NAME:-lala_bridge_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 --set=client_min_messages=warning)

psql -X -q -c "drop database if exists $DB" -d postgres
psql -X -q -c "create database $DB" -d postgres

"${PSQL[@]}" -d "$DB" -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  echo "migração: $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql

status=0
for t in supabase/tests/*.test.sql; do
  if "${PSQL[@]}" -d "$DB" -f "$t" >/tmp/lala-db-test.log 2>&1; then
    echo "ok   $t"
  else
    echo "FALHOU $t"; cat /tmp/lala-db-test.log; status=1
  fi
done
exit $status
