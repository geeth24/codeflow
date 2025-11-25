# CodeFlow Frontend

Next.js 16 frontend application for CodeFlow - an interactive code execution visualizer.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **TailwindCSS 4**
- **shadcn/ui** - UI component library
- **Framer Motion** - Animations
- **CodeMirror 6** - Code editor with syntax highlighting
- **next-themes** - Dark mode support

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
pnpm build
pnpm start
```

## Environment Variables

Create `.env.local`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Key Features

- **Multi-language Editor**: Supports Python, JavaScript, and TypeScript
- **Real-time Code Execution**: Visualize code execution step-by-step
- **Variable Tracking**: See variable values update in real-time
- **Timeline Controls**: Play, pause, and step through execution
- **AI Tutor**: Get explanations powered by Anthropic Claude
- **Dark Mode**: System-aware theme with manual toggle
- **Local Storage**: Code and traces persist across sessions

## Project Structure

```
client/
├── app/
│   ├── api/              # Next.js API routes (proxies to backend)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page
├── components/
│   ├── editor.tsx        # CodeMirror editor component
│   ├── animation-panel.tsx    # Variable and stack visualization
│   ├── variable-panel.tsx     # Variable display panel
│   ├── timeline-controls.tsx  # Playback controls
│   ├── tutor-panel.tsx        # AI tutor interface
│   └── ui/               # shadcn/ui components
└── lib/
    ├── api.ts            # API client functions
    └── types.ts          # TypeScript type definitions
```

## Docker

### Development

```bash
docker build -f Dockerfile.dev -t codeflow-frontend:dev .
docker run -p 3000:3000 -v $(pwd):/app codeflow-frontend:dev
```

### Production

```bash
docker build -f Dockerfile -t codeflow-frontend:latest .
docker run -p 3000:3000 codeflow-frontend:latest
```

See the main [README.md](../README.md) for more information.
