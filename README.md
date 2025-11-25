# CodeFlow

An interactive Python code execution visualizer with step-by-step tracing and AI-powered explanations.

## Features

- **Interactive Code Editor**: Write Python code with syntax highlighting
- **Step-by-Step Execution**: Visualize code execution with variable tracking
- **Timeline Controls**: Play, pause, step through execution
- **Variable Panel**: See variable values update in real-time with blur-in animations
- **CodeFlow Tutor**: Get AI-powered explanations of code execution
- **Dark Mode**: System-aware dark mode with manual toggle

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- CodeMirror 6

### Backend
- FastAPI
- Python 3.11
- Anthropic Claude API
- Python code tracing with sys.settrace

## Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- pnpm
- uv (Python package manager)

### Frontend Setup

```bash
cd client
pnpm install
pnpm dev
```

### Backend Setup

```bash
cd server
uv pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

Create `.env.local` in the root directory:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Create `server/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Docker Setup

### Build and Run

```bash
docker-compose up --build
```

This will start both frontend (port 3000) and backend (port 8000).

### Dockerfile

The Dockerfile uses a multi-stage build:
1. Frontend builder: Installs dependencies and builds Next.js app
2. Backend builder: Installs Python dependencies
3. Final stage: Combines both

## Usage

1. Write Python code in the editor
2. Click "Run" to execute and trace the code
3. Use timeline controls to step through execution
4. View variable changes in the right panel
5. Ask CodeFlow Tutor questions about the code execution

## Project Structure

```
codeflow/
├── client/                 # Next.js frontend
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── editor.tsx
│   │   ├── animation-panel.tsx
│   │   ├── variable-panel.tsx
│   │   ├── timeline-controls.tsx
│   │   └── tutor-panel.tsx
│   └── lib/
│       ├── types.ts
│       └── api.ts
├── server/                 # FastAPI backend
│   ├── main.py
│   ├── tracer.py
│   ├── ai.py
│   └── models.py
└── docker-compose.yml
```

## Sandbox Security

The Python executor includes:
- 1.5 second timeout
- Restricted imports (only `math` and `random` allowed)
- Memory guards
- Isolated execution environment

## License

MIT

