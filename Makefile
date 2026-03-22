.PHONY: dev dev-frontend dev-backend test lint

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev:
	make dev-backend & make dev-frontend

test:
	cd backend && source .venv/bin/activate && pytest tests/ -v

lint:
	cd backend && source .venv/bin/activate && ruff check app/ tests/
	cd frontend && npx next lint
