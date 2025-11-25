"use client"

import { useState, useEffect, useRef } from "react"
import { Editor } from "@/components/editor"
import { AnimationPanel } from "@/components/animation-panel"
import { TimelineControls } from "@/components/timeline-controls"
import { TutorPanel } from "@/components/tutor-panel"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppLogo } from "@/components/app-logo"
import { Play, Moon, Sun, Settings, X } from "lucide-react"
import { useTheme } from "next-themes"
import { runCode } from "@/lib/api"
import { TraceStep } from "@/lib/types"
import { motion, AnimatePresence, useDragControls } from "framer-motion"

const DEFAULT_PYTHON_CODE = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(5)
print(result)
`

const DEFAULT_JS_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(5);
console.log(result);
`

const DEFAULT_TS_CODE = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result: number = fibonacci(5);
console.log(result);
`

export default function Home() {
  const [language, setLanguage] = useState<"python" | "javascript" | "typescript">("python")
  const [code, setCode] = useState(DEFAULT_PYTHON_CODE)
  const [trace, setTrace] = useState<TraceStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const { theme, setTheme } = useTheme()
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showTutor, setShowTutor] = useState(false)
  const dragControls = useDragControls()

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true)
    const savedCode = localStorage.getItem("codeflow_code")
    const savedLanguage = localStorage.getItem("codeflow_language") as "python" | "javascript" | "typescript" | null
    const savedTrace = localStorage.getItem("codeflow_trace")
    
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedCode) {
      setCode(savedCode)
    } else {
      // Set default if no saved code (and no language change triggered it yet)
      setCode(savedLanguage === "javascript" ? DEFAULT_JS_CODE : savedLanguage === "typescript" ? DEFAULT_TS_CODE : DEFAULT_PYTHON_CODE)
    }

    if (savedTrace) {
      try {
        const parsedTrace = JSON.parse(savedTrace)
        setTrace(parsedTrace)
        if (parsedTrace.length > 0) {
          setCurrentStepIndex(0)
        }
      } catch (e) {
        console.error("Failed to parse saved trace", e)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("codeflow_code", code)
      localStorage.setItem("codeflow_language", language)
    }
  }, [code, language, isMounted])

  useEffect(() => {
    if (isMounted && trace.length > 0) {
      localStorage.setItem("codeflow_trace", JSON.stringify(trace))
    }
  }, [trace, isMounted])

  const currentStep = currentStepIndex >= 0 && currentStepIndex < trace.length 
    ? trace[currentStepIndex] 
    : null

  const handleRun = async () => {
    setIsRunning(true)
    setCurrentStepIndex(-1)
    setTrace([])
    
    try {
      const response = await runCode(code, language)
      
      // If the backend auto-generated a driver call, update the code
      if (response.modified_code) {
        setCode(response.modified_code)
      }
      
      setTrace(response.trace || [])
      setCurrentStepIndex(0)
    } catch (error) {
      console.error("Failed to run code:", error)
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    if (isPlaying && trace.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000) // Slower speed (1 second per step) for better readability
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, trace.length])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (trace.length === 0) return

      if (e.key === "ArrowRight") {
        e.preventDefault()
        setIsPlaying(false)
        setCurrentStepIndex((prev) => Math.min(prev + 1, trace.length - 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setIsPlaying(false)
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [trace.length])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background transition-colors duration-500">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 bg-card/50 backdrop-blur-xl px-6 py-3 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 p-2">
              <AppLogo className="text-white" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
              CodeFlow
            </span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          <Select
            value={language}
            onValueChange={(value) => {
              const newLang = value as "python" | "javascript" | "typescript"
              setLanguage(newLang)
              const defaultCodes = { python: DEFAULT_PYTHON_CODE, javascript: DEFAULT_JS_CODE, typescript: DEFAULT_TS_CODE }
              setCode(defaultCodes[newLang])
              setTrace([])
              setCurrentStepIndex(-1)
            }}
          >
            <SelectTrigger className="w-[140px] bg-muted/50 border-border/50 text-foreground hover:bg-muted transition-colors">
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
            className="rounded-full hover:bg-muted"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          
          <div className="h-6 w-px bg-border/50 mx-1" />
          
          <Button
            variant={showTutor ? "secondary" : "ghost"}
            size="icon"
            className="rounded-full hover:bg-muted w-10 h-10"
            onClick={() => setShowTutor(!showTutor)}
          >
            <AppLogo className="w-5 h-5" />
          </Button>

          <Button 
            onClick={handleRun} 
            disabled={isRunning}
            className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--color-primary)] transition-all hover:shadow-[0_0_30px_-5px_var(--color-primary)] hover:scale-[1.02]"
          >
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Settings className="h-4 w-4" />
              </motion.div>
            ) : (
              <Play className="mr-2 h-4 w-4 fill-current" />
            )}
            {isRunning ? "Running..." : "Run Code"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Panel: Execution State (Variables & Stack) */}
        <div className="w-[350px] flex flex-col border-r border-border/40 bg-muted/30 backdrop-blur-sm z-10">
          <div className="flex-1 overflow-hidden p-4">
            <AnimationPanel currentStep={currentStep} trace={trace} />
          </div>
        </div>

        {/* Center Panel: Code Editor */}
        <div className="flex-1 flex flex-col relative bg-background z-0">
          <div className="flex-1 overflow-hidden relative group">
            <Editor 
              code={code} 
              language={language}
              onChange={setCode} 
              currentLine={currentStep?.line} 
              variables={currentStep?.locals}
            />
            
            {/* Overlay gradient for focus effect */}
            <div className="absolute inset-0 pointer-events-none border-2 border-primary/0 group-focus-within:border-primary/20 transition-colors rounded-xl z-10" />
          </div>
          
          {/* Floating Timeline Controls */}
          <AnimatePresence>
            {trace.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50"
              >
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 glass-panel">
                  <TimelineControls
                    trace={trace}
                    currentStepIndex={currentStepIndex}
                    isPlaying={isPlaying}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onStepForward={() => {
                      setIsPlaying(false)
                      setCurrentStepIndex((prev) => Math.min(prev + 1, trace.length - 1))
                    }}
                    onStepBack={() => {
                      setIsPlaying(false)
                      setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
                    }}
                    onSkipToStart={() => {
                      setIsPlaying(false)
                      setCurrentStepIndex(0)
                    }}
                    onSkipToEnd={() => {
                      setIsPlaying(false)
                      setCurrentStepIndex(trace.length - 1)
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-10 top-10 w-[400px] h-[600px] inset-panel backdrop-blur-xl z-50 flex flex-col rounded-2xl overflow-hidden border border-border/50"
            >
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center justify-between p-4 border-b border-border/10 bg-muted/20 cursor-grab active:cursor-grabbing touch-none"
              >
                <span className="text-sm font-medium flex items-center gap-2 select-none">
                  <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center p-1">
                    <AppLogo className="text-primary" />
                  </div>
                  CodeFlow Tutor
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted rounded-full" onClick={() => setShowTutor(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-background/40">
                <TutorPanel code={code} trace={trace} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
