'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  StepForward,
  StepBack,
  SkipForward,
  SkipBack,
  RotateCcw,
  PlayCircle,
  Film,
} from 'lucide-react';
import { TraceStep } from '@/lib/types';

interface TimelineControlsProps {
  trace: TraceStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  breakpoints?: Set<number>;
  isPausedAtBreakpoint?: boolean;
  onContinue?: () => void;
  onExport?: () => void;
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
  breakpoints = new Set(),
  isPausedAtBreakpoint = false,
  onContinue,
  onExport,
}: TimelineControlsProps) {
  const progress = trace.length > 0 ? ((currentStepIndex + 1) / trace.length) * 100 : 0;

  // Calculate breakpoint positions on the timeline
  const breakpointPositions = trace
    .map((step, index) => ({
      index,
      position: ((index + 1) / trace.length) * 100,
      hasBreakpoint: breakpoints.has(step.line),
    }))
    .filter((bp) => bp.hasBreakpoint);

  return (
    <div className="border-border/20 bg-card/80 border-t p-4 pb-6 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {/* Progress Bar with Breakpoint Indicators */}
        <div className="bg-secondary/50 group relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full">
          <motion.div
            className="bg-primary absolute top-0 left-0 h-full shadow-[0_0_10px_var(--color-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          {/* Breakpoint markers on timeline */}
          {breakpointPositions.map((bp) => (
            <div
              key={bp.index}
              className="absolute top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
              style={{ left: `calc(${bp.position}% - 5px)` }}
              title={`Breakpoint at step ${bp.index + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-16 font-mono text-xs">
              Step {currentStepIndex + 1}
            </span>
            <span className="text-muted-foreground/50 font-mono text-xs">/</span>
            <span className="text-muted-foreground w-16 font-mono text-xs">{trace.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-secondary/50 border-border/10 flex rounded-lg border p-1">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-background/50 h-8 w-8"
                onClick={onSkipToStart}
                disabled={currentStepIndex === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-background/50 h-8 w-8"
                onClick={onStepBack}
                disabled={currentStepIndex === 0}
              >
                <StepBack className="h-4 w-4" />
              </Button>
            </div>

            {isPausedAtBreakpoint ? (
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-red-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.8)] transition-transform hover:scale-105 hover:bg-red-600"
                onClick={onContinue}
                title="Continue from breakpoint"
              >
                <PlayCircle className="h-5 w-5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-[0_0_20px_-5px_var(--color-primary)] transition-transform hover:scale-105"
                onClick={isPlaying ? onPause : onPlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                )}
              </Button>
            )}

            <div className="bg-secondary/50 border-border/10 flex rounded-lg border p-1">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-background/50 h-8 w-8"
                onClick={onStepForward}
                disabled={currentStepIndex >= trace.length - 1}
              >
                <StepForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-background/50 h-8 w-8"
                onClick={onSkipToEnd}
                disabled={currentStepIndex >= trace.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex w-32 justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary text-xs"
              onClick={onExport}
              title="Export animation"
            >
              <Film className="mr-1 h-3 w-3" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary text-xs"
              onClick={onSkipToStart}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
