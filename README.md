# CodeFlow

An interactive code execution visualizer with step-by-step tracing and AI-powered explanations. Supports Python, JavaScript, and TypeScript.

## Features

- **Multi-Language Support**: Write and visualize code in Python, JavaScript, or TypeScript
- **Interactive Code Editor**: Syntax highlighting with CodeMirror 6
- **Step-by-Step Execution**: Visualize code execution with variable tracking
- **Timeline Controls**: Play, pause, step through execution with keyboard navigation
- **Variable Panel**: See variable values update in real-time with blur-in animations
- **CodeFlow Tutor**: Get AI-powered explanations of code execution (draggable overlay)
- **Dark Mode**: System-aware dark mode with manual toggle
- **Auto-Generated Examples**: AI automatically generates example calls for function definitions
- **Local Storage**: Code and traces persist across sessions

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- TypeScript
- TailwindCSS 4
- shadcn/ui
- Framer Motion
- CodeMirror 6

### Backend
- FastAPI
- Python 3.11
- Anthropic Claude API
- Python code tracing with sys.settrace
- Node.js runner service for JavaScript/TypeScript execution

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

Create `.env.local` in the `client` directory:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Create `server/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
NODE_RUNNER_URL=http://localhost:3001
```

## Docker Setup

### Development

```bash
docker-compose up --build
```

This will start:
- Frontend on port 3000
- Backend on port 8000
- Node.js runner on port 3001

All services use development Dockerfiles with hot-reload enabled.

### Production Build

Build and push images using the provided script:

```bash
./build-and-push.sh [tag]
```

Or manually build each service:

```bash
# Backend
docker build -f server/Dockerfile -t codeflow/backend:latest ./server

# Node Runner
docker build -f runners/node/Dockerfile -t codeflow/runner-node:latest ./runners/node

# Frontend
docker build -f client/Dockerfile -t codeflow/frontend:latest ./client
```

### CI/CD

The project includes GitHub Actions workflow (`.github/workflows/build-deploy.yml`) that:
- Builds and pushes Docker images to registry on push to main
- Deploys to Kubernetes using Helm
- Supports manual workflow dispatch with custom image tags

## Usage

1. Select a language (Python, JavaScript, or TypeScript) from the dropdown
2. Write code in the editor
3. Click "Run Code" to execute and trace the code
4. Use timeline controls to step through execution (or arrow keys for keyboard navigation)
5. View variable changes in the left panel
6. Click the CodeFlow Tutor icon to open AI-powered explanations (draggable overlay)
7. Code and traces are automatically saved to localStorage

## Project Structure

```
codeflow/
├── client/                 # Next.js frontend
│   ├── app/
│   │   ├── api/           # API routes (run, explain)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── editor.tsx
│   │   ├── animation-panel.tsx
│   │   ├── variable-panel.tsx
│   │   ├── timeline-controls.tsx
│   │   ├── tutor-panel.tsx
│   │   └── ui/            # shadcn/ui components
│   └── lib/
│       ├── types.ts
│       └── api.ts
├── server/                 # FastAPI backend
│   ├── main.py            # API endpoints
│   ├── tracer.py          # Python code tracing
│   ├── ai.py              # Anthropic Claude integration
│   └── models.py          # Pydantic models
├── runners/
│   └── node/              # Node.js runner for JS/TS
│       ├── server.js       # Express server
│       └── tracer.js       # JavaScript tracing logic
├── docker-compose.yml      # Development setup
├── build-and-push.sh       # Production build script
└── .github/
    └── workflows/
        └── build-deploy.yml  # CI/CD pipeline
```

## Security

### Python Executor
- 1.5 second timeout
- Restricted imports (only `math` and `random` allowed)
- Memory guards
- Isolated execution environment

### Node.js Runner
- Separate Docker container for isolation
- Timeout protection
- Runs in isolated environment

## Deployment

The application is designed to run on Kubernetes with Helm charts. The CI/CD pipeline automatically:
1. Builds Docker images for all services
2. Pushes to container registry
3. Deploys using Helm
4. Restarts deployments and waits for rollout

## Development

### Hot Reload
All services support hot-reload in development mode:
- Frontend: Next.js dev server with Fast Refresh
- Backend: Uvicorn with `--reload`
- Node Runner: Nodemon or similar for auto-restart

### Keyboard Shortcuts
- `Arrow Right`: Step forward through execution
- `Arrow Left`: Step backward through execution

## License

MIT

