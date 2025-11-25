'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@/components/editor';
import { AnimationPanel } from '@/components/animation-panel';
import { TimelineControls } from '@/components/timeline-controls';
import { TutorPanel } from '@/components/tutor-panel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLogo } from '@/components/app-logo';
import { Play, Moon, Sun, Settings, X, Network } from 'lucide-react';
import { useTheme } from 'next-themes';
import { runCode } from '@/lib/api';
import { TraceStep } from '@/lib/types';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { DataStructurePanel } from '@/components/data-structure-panel';
import { ExportDialog } from '@/components/export-dialog';

const DEFAULT_PYTHON_CODE = `# Data structure examples
nums = [1, 2, 3, 4, 5]
matrix = [[1, 2], [3, 4], [5, 6]]

# Binary tree
tree = {"val": 1, "left": {"val": 2}, "right": {"val": 3}}

# Linked list
head = {"val": "A", "next": {"val": "B", "next": {"val": "C"}}}

# Simple loop
total = 0
for n in nums:
    total += n
print(total)
`;

const DEFAULT_JS_CODE = `// Data structure examples
const nums = [1, 2, 3, 4, 5];
const matrix = [[1, 2], [3, 4], [5, 6]];

// Binary tree
const tree = {val: 1, left: {val: 2}, right: {val: 3}};

// Linked list
const head = {val: "A", next: {val: "B", next: {val: "C"}}};

// Simple loop
let total = 0;
for (const n of nums) {
  total += n;
}
console.log(total);
`;

const DEFAULT_TS_CODE = `// Data structure examples
const nums: number[] = [1, 2, 3, 4, 5];
const matrix: number[][] = [[1, 2], [3, 4], [5, 6]];

// Binary tree
interface TreeNode { val: number; left?: TreeNode; right?: TreeNode; }
const tree: TreeNode = {val: 1, left: {val: 2}, right: {val: 3}};

// Simple loop
let total: number = 0;
for (const n of nums) {
  total += n;
}
console.log(total);
`;

export default function Home() {
  const [language, setLanguage] = useState<'python' | 'javascript' | 'typescript'>('python');
  const [code, setCode] = useState(DEFAULT_PYTHON_CODE);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const { theme, setTheme } = useTheme();
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const dragControls = useDragControls();
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isPausedAtBreakpoint, setIsPausedAtBreakpoint] = useState(false);
  const [showDataStructures, setShowDataStructures] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const savedCode = localStorage.getItem('codeflow_code');
    const savedLanguage = localStorage.getItem('codeflow_language') as
      | 'python'
      | 'javascript'
      | 'typescript'
      | null;
    const savedTrace = localStorage.getItem('codeflow_trace');
    const savedBreakpoints = localStorage.getItem('codeflow_breakpoints');

    if (savedLanguage) setLanguage(savedLanguage);
    if (savedCode) {
      setCode(savedCode);
    } else {
      // Set default if no saved code (and no language change triggered it yet)
      setCode(
        savedLanguage === 'javascript'
          ? DEFAULT_JS_CODE
          : savedLanguage === 'typescript'
            ? DEFAULT_TS_CODE
            : DEFAULT_PYTHON_CODE,
      );
    }

    if (savedTrace) {
      try {
        const parsedTrace = JSON.parse(savedTrace);
        setTrace(parsedTrace);
        // Don't set currentStepIndex on reload - keep at -1 so no line is highlighted
        // User must explicitly click play or step to start visualization
      } catch (e) {
        console.error('Failed to parse saved trace', e);
      }
    }

    if (savedBreakpoints) {
      try {
        const parsedBreakpoints = JSON.parse(savedBreakpoints);
        setBreakpoints(new Set(parsedBreakpoints));
      } catch (e) {
        console.error('Failed to parse saved breakpoints', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('codeflow_code', code);
      localStorage.setItem('codeflow_language', language);
    }
  }, [code, language, isMounted]);

  // Save breakpoints to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('codeflow_breakpoints', JSON.stringify([...breakpoints]));
    }
  }, [breakpoints, isMounted]);

  // Toggle breakpoint handler
  const handleBreakpointToggle = (line: number) => {
    setBreakpoints((prev) => {
      const newBreakpoints = new Set(prev);
      if (newBreakpoints.has(line)) {
        newBreakpoints.delete(line);
      } else {
        newBreakpoints.add(line);
      }
      return newBreakpoints;
    });
  };

  useEffect(() => {
    if (isMounted && trace.length > 0) {
      localStorage.setItem('codeflow_trace', JSON.stringify(trace));
    }
  }, [trace, isMounted]);

  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < trace.length ? trace[currentStepIndex] : null;

  const handleRun = async () => {
    setIsRunning(true);
    setCurrentStepIndex(-1);
    setTrace([]);

    try {
      const response = await runCode(code, language);

      // If the backend auto-generated a driver call, update the code
      if (response.modified_code) {
        setCode(response.modified_code);
      }

      setTrace(response.trace || []);
      setCurrentStepIndex(0);
    } catch (error) {
      console.error('Failed to run code:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isPlaying && trace.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const nextStep = prev + 1;
          const nextLine = trace[nextStep]?.line;

          // Check if next step hits a breakpoint
          if (breakpoints.has(nextLine)) {
            setIsPlaying(false);
            setIsPausedAtBreakpoint(true);
          }

          return nextStep;
        });
      }, 1000); // Slower speed (1 second per step) for better readability
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, trace.length, breakpoints, trace]);

  // Continue from breakpoint
  const handleContinue = () => {
    setIsPausedAtBreakpoint(false);
    setIsPlaying(true);
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (trace.length === 0) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.min(prev + 1, trace.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trace.length]);

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden transition-colors duration-500">
      {/* Header */}
      <header className="border-border/40 bg-card/50 z-50 flex items-center justify-between border-b px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="from-primary shadow-primary/20 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br to-purple-600 p-2 shadow-lg">
              <AppLogo className="text-white" />
            </div>
            <span className="from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-bold text-transparent">
              CodeFlow
            </span>
          </div>

          <div className="bg-border/50 h-6 w-px" />

          <Select
            value={language}
            onValueChange={(value) => {
              const newLang = value as 'python' | 'javascript' | 'typescript';
              setLanguage(newLang);
              const defaultCodes = {
                python: DEFAULT_PYTHON_CODE,
                javascript: DEFAULT_JS_CODE,
                typescript: DEFAULT_TS_CODE,
              };
              setCode(defaultCodes[newLang]);
              setTrace([]);
              setCurrentStepIndex(-1);
            }}
          >
            <SelectTrigger className="bg-muted/50 border-border/50 text-foreground hover:bg-muted w-[140px] transition-colors">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>

          <div className="bg-border/50 mx-1 h-6 w-px" />

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted rounded-full"
            onClick={() => setShowDataStructures(true)}
            title="Data structure visualizer"
          >
            <Network className="h-4 w-4" />
          </Button>

          <Button
            variant={showTutor ? 'secondary' : 'ghost'}
            size="icon"
            className="hover:bg-muted h-10 w-10 rounded-full"
            onClick={() => setShowTutor(!showTutor)}
          >
            <AppLogo className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="bg-primary hover:bg-primary/90 rounded-full px-6 shadow-[0_0_20px_-5px_var(--color-primary)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_var(--color-primary)]"
          >
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Settings className="h-4 w-4" />
              </motion.div>
            ) : (
              <Play className="mr-2 h-4 w-4 fill-current" />
            )}
            {isRunning ? 'Running...' : 'Run Code'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Panel: Execution State (Variables & Stack) */}
        <div className="border-border/40 bg-muted/30 z-10 flex w-[350px] flex-col border-r backdrop-blur-sm">
          <div className="flex-1 overflow-hidden p-4">
            <AnimationPanel
              currentStep={currentStep}
              trace={trace}
              currentStepIndex={currentStepIndex}
            />
          </div>
        </div>

        {/* Center Panel: Code Editor */}
        <div className="bg-background relative z-0 flex flex-1 flex-col">
          <div className="group relative flex-1 overflow-hidden">
            <Editor
              code={code}
              language={language}
              onChange={setCode}
              currentLine={currentStep?.line}
              variables={currentStep?.locals}
              breakpoints={breakpoints}
              onBreakpointToggle={handleBreakpointToggle}
            />

            {/* Overlay gradient for focus effect */}
            <div className="border-primary/0 group-focus-within:border-primary/20 pointer-events-none absolute inset-0 z-10 rounded-xl border-2 transition-colors" />
          </div>

          {/* Floating Timeline Controls */}
          <AnimatePresence>
            {trace.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute bottom-6 left-1/2 z-50 w-[90%] max-w-2xl -translate-x-1/2"
              >
                <div className="border-border/50 glass-panel overflow-hidden rounded-2xl border shadow-2xl">
                  <TimelineControls
                    trace={trace}
                    currentStepIndex={currentStepIndex}
                    isPlaying={isPlaying}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onStepForward={() => {
                      setIsPlaying(false);
                      setIsPausedAtBreakpoint(false);
                      setCurrentStepIndex((prev) => Math.min(prev + 1, trace.length - 1));
                    }}
                    onStepBack={() => {
                      setIsPlaying(false);
                      setIsPausedAtBreakpoint(false);
                      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
                    }}
                    onSkipToStart={() => {
                      setIsPlaying(false);
                      setIsPausedAtBreakpoint(false);
                      setCurrentStepIndex(0);
                    }}
                    onSkipToEnd={() => {
                      setIsPlaying(false);
                      setIsPausedAtBreakpoint(false);
                      setCurrentStepIndex(trace.length - 1);
                    }}
                    breakpoints={breakpoints}
                    isPausedAtBreakpoint={isPausedAtBreakpoint}
                    onContinue={handleContinue}
                    onExport={() => setShowExportDialog(true)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Data Structure Visualizer Panel */}
        <DataStructurePanel
          isOpen={showDataStructures}
          onClose={() => setShowDataStructures(false)}
          variables={currentStep?.locals || {}}
          allVariables={
            // Collect all unique variables from the entire trace
            trace.reduce(
              (acc, step) => {
                Object.entries(step.locals).forEach(([key, value]) => {
                  // Keep the most complex version of each variable
                  if (!acc[key] || (typeof value === 'object' && value !== null)) {
                    acc[key] = value;
                  }
                });
                return acc;
              },
              {} as Record<string, unknown>,
            )
          }
        />

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          code={code}
          trace={trace}
        />

        {/* Right Panel: CodeFlow Tutor (Draggable Overlay) */}
        <AnimatePresence>
          {showTutor && (
            <motion.div
              drag
              dragListener={false}
              dragControls={dragControls}
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="inset-panel border-border/50 absolute top-10 right-10 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
            >
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="border-border/10 bg-muted/20 flex cursor-grab touch-none items-center justify-between border-b p-4 active:cursor-grabbing"
              >
                <span className="flex items-center gap-2 text-sm font-medium select-none">
                  <div className="bg-primary/20 flex h-6 w-6 items-center justify-center rounded-md p-1">
                    <AppLogo className="text-primary" />
                  </div>
                  CodeFlow Tutor
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted h-6 w-6 rounded-full"
                    onClick={() => setShowTutor(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="bg-background/40 flex-1 overflow-hidden">
                <TutorPanel code={code} trace={trace} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
