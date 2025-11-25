.PHONY: lint lint-fix format format-fix fix check install

# Install dependencies
install:
	pip install -r requirements.txt

# Lint only (no fixes)
lint:
	python3 -m ruff check .

# Lint with auto-fix
lint-fix:
	python3 -m ruff check --fix .

# Format only (no fixes)
format:
	python3 -m black --check .

# Format with auto-fix
format-fix:
	python3 -m black .

# Run both lint-fix and format-fix
fix: lint-fix format-fix

# Check everything (lint + format)
check: lint format

