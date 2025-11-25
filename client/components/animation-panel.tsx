'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VariablePanel } from './variable-panel';
import { VariableHistoryGraph } from './variable-history-graph';
import { TraceStep } from '@/lib/types';
import { Terminal, ListTree, BarChart3, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnimationPanelProps {
  currentStep: TraceStep | null;
  trace: TraceStep[];
  currentStepIndex?: number;
}

export function AnimationPanel({ currentStep, trace, currentStepIndex = 0 }: AnimationPanelProps) {
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');

  if (!currentStep) {
    return (
      <Card className="glass text-muted-foreground flex h-full flex-col items-center justify-center border-none p-8 text-center shadow-none">
        <div className="bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Terminal className="text-primary h-8 w-8" />
        </div>
        <h3 className="text-foreground mb-2 text-lg font-medium">Ready to Run</h3>
        <p className="max-w-[200px] text-sm">
          Write your Python code and click Run to visualize execution
        </p>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="inset-panel relative flex flex-1 flex-col overflow-hidden rounded-xl">
        <div className="border-border/20 bg-muted/50 z-10 flex shrink-0 items-center justify-between border-b p-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            {viewMode === 'current' ? (
              <Terminal className="text-primary h-4 w-4" />
            ) : (
              <BarChart3 className="text-primary h-4 w-4" />
            )}
            {viewMode === 'current' ? 'Variables' : 'Variable History'}
          </h3>
          <div className="bg-muted/50 border-border/30 flex rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-xs ${viewMode === 'current' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('current')}
            >
              <Layers className="mr-1 h-3 w-3" />
              Current
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-xs ${viewMode === 'history' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('history')}
            >
              <BarChart3 className="mr-1 h-3 w-3" />
              History
            </Button>
          </div>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {viewMode === 'current' ? (
              <motion.div
                key="current"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <VariablePanel variables={currentStep.locals} />
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <VariableHistoryGraph trace={trace} currentStepIndex={currentStepIndex} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Card className="inset-panel flex h-[200px] shrink-0 flex-col overflow-hidden shadow-none">
        <CardHeader className="border-border/20 bg-muted/50 flex shrink-0 flex-row items-center justify-between rounded-t-xl border-b pt-6">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTree className="text-primary h-4 w-4" />
            Call Stack
          </CardTitle>
          <span className="text-muted-foreground bg-primary/10 border-primary/20 rounded-full border px-2 py-0.5 font-mono text-[10px]">
            Line {currentStep.line}
          </span>
        </CardHeader>
        <CardContent className="custom-scrollbar h-full overflow-y-auto p-4">
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
                  className={`flex items-center gap-3 rounded-lg p-2 font-mono text-sm ${
                    index === currentStep.stack.length - 1
                      ? 'bg-primary/10 text-primary border-primary/20 border shadow-[0_0_10px_-3px_var(--color-primary)]'
                      : 'text-muted-foreground opacity-60'
                  } `}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {frame}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
