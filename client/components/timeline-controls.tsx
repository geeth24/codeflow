"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Play, Pause, StepForward, StepBack, SkipForward, SkipBack, RotateCcw } from "lucide-react"
import { TraceStep } from "@/lib/types"
import { Slider } from "@/components/ui/slider"

interface TimelineControlsProps {
  trace: TraceStep[]
  currentStepIndex: number
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onSkipToStart: () => void
  onSkipToEnd: () => void
}

export function TimelineControls({
  trace,
  currentStepIndex,
  isPlaying,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onSkipToStart,
  onSkipToEnd,
}: TimelineControlsProps) {
  const progress = trace.length > 0 ? ((currentStepIndex + 1) / trace.length) * 100 : 0

  return (
    <div className="border-t border-border/20 bg-card/80 backdrop-blur-xl p-4 pb-6">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="relative h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden group cursor-pointer">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_var(--color-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          {/* Hover tooltip could go here */}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted-foreground w-16">
              Step {currentStepIndex + 1}
            </span>
            <span className="text-xs font-mono text-muted-foreground/50">/</span>
            <span className="text-xs font-mono text-muted-foreground w-16">
              {trace.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background/50"
                onClick={onSkipToStart}
                disabled={currentStepIndex === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background/50"
                onClick={onStepBack}
                disabled={currentStepIndex === 0}
              >
                <StepBack className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full shadow-[0_0_20px_-5px_var(--color-primary)] hover:scale-105 transition-transform"
              onClick={isPlaying ? onPause : onPlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </Button>

            <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background/50"
                onClick={onStepForward}
                disabled={currentStepIndex >= trace.length - 1}
              >
                <StepForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background/50"
                onClick={onSkipToEnd}
                disabled={currentStepIndex >= trace.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="w-32 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={onSkipToStart}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
