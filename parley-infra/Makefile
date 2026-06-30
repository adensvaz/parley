# Parley infra — local DB + platform ops
.PHONY: db.up db.migrate db.test up down

db.up:
	docker compose up -d postgres pgbouncer

db.migrate:
	@for f in $$(ls db/migrations/*.sql | sort); do echo "applying $$f"; \
	  docker compose exec -T postgres psql -U postgres -d parley -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/$$(basename $$f); done

db.test: ## apply migrations to a throwaway PG and assert RLS/encryption/index behavior
	./db/test.sh

up:
	docker compose up -d --build

down:
	docker compose down
