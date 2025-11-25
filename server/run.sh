#!/bin/bash

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

if [ ! -f "requirements.txt" ]; then
    echo "requirements.txt not found!"
    exit 1
fi

pip install -r requirements.txt

echo "Starting FastAPI server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000



