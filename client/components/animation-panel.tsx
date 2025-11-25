"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VariablePanel } from "./variable-panel"
import { TraceStep } from "@/lib/types"
import { Terminal, ListTree } from "lucide-react"

interface AnimationPanelProps {
  currentStep: TraceStep | null
  trace: TraceStep[]
}

export function AnimationPanel({ currentStep, trace }: AnimationPanelProps) {
  if (!currentStep) {
    return (
      <Card className="h-full glass border-none shadow-none flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Ready to Run</h3>
        <p className="text-sm max-w-[200px]">
          Write your Python code and click Run to visualize execution
        </p>
      </Card>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 rounded-xl inset-panel overflow-hidden flex flex-col relative">
        <div className="p-3 border-b border-border/20 bg-muted/50 z-10 shrink-0">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            Variables
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <VariablePanel variables={currentStep.locals} />
        </div>
      </div>

      <Card className="inset-panel shadow-none overflow-hidden h-[200px] shrink-0 flex flex-col">
        <CardHeader className="pt-6 border-b border-border/20 bg-muted/50 rounded-t-xl flex flex-row items-center justify-between shrink-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListTree className="w-4 h-4 text-primary" />
            Call Stack
          </CardTitle>
          <span className="text-[10px] font-mono text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            Line {currentStep.line}
          </span>
        </CardHeader>
        <CardContent className="p-4 overflow-y-auto h-full custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col-reverse gap-2"
            >
              {currentStep.stack.map((frame, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg text-sm font-mono
                    ${index === currentStep.stack.length - 1 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_-3px_var(--color-primary)]' 
                      : 'text-muted-foreground opacity-60'}
                  `}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {frame}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
