'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TraceStep } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VariableHistoryGraphProps {
  trace: TraceStep[];
  currentStepIndex: number;
}

interface VariableData {
  name: string;
  values: (number | null)[];
  color: string;
  visible: boolean;
}

const COLORS = [
  'rgb(59, 130, 246)', // blue
  'rgb(16, 185, 129)', // emerald
  'rgb(249, 115, 22)', // orange
  'rgb(168, 85, 247)', // purple
  'rgb(236, 72, 153)', // pink
  'rgb(234, 179, 8)', // yellow
  'rgb(6, 182, 212)', // cyan
  'rgb(239, 68, 68)', // red
];

export function VariableHistoryGraph({ trace, currentStepIndex }: VariableHistoryGraphProps) {
  const [visibleVars, setVisibleVars] = useState<Set<string>>(new Set());

  // Extract numeric variables and their history
  const variableHistory = useMemo(() => {
    const history: Record<string, (number | null)[]> = {};
    const allVars = new Set<string>();

    // First pass: collect all numeric variable names
    trace.forEach((step) => {
      Object.entries(step.locals).forEach(([key, value]) => {
        if (typeof value === 'number' && !key.startsWith('_')) {
          allVars.add(key);
        }
      });
    });

    // Initialize history arrays
    allVars.forEach((name) => {
      history[name] = new Array(trace.length).fill(null);
    });

    // Second pass: fill in values
    trace.forEach((step, index) => {
      allVars.forEach((name) => {
        const value = step.locals[name];
        if (typeof value === 'number') {
          history[name][index] = value;
        }
      });
    });

    return history;
  }, [trace]);

  // Convert to array format with colors
  const variables: VariableData[] = useMemo(() => {
    return Object.entries(variableHistory).map(([name, values], index) => ({
      name,
      values,
      color: COLORS[index % COLORS.length],
      visible: visibleVars.size === 0 || visibleVars.has(name),
    }));
  }, [variableHistory, visibleVars]);

  // Calculate min/max for scaling
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    variables.forEach((variable) => {
      if (!variable.visible) return;
      variable.values.forEach((v) => {
        if (v !== null) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
    });

    // Add padding
    const padding = (max - min) * 0.1 || 1;
    return {
      minValue: min === Infinity ? 0 : min - padding,
      maxValue: max === -Infinity ? 10 : max + padding,
    };
  }, [variables]);

  const toggleVariable = (name: string) => {
    setVisibleVars((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      // If all are deselected, show all
      if (next.size === 0) {
        return new Set();
      }
      return next;
    });
  };

  if (variables.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-4 text-center text-sm">
        <TrendingUp className="mb-2 h-8 w-8 opacity-50" />
        <p>No numeric variables to graph</p>
        <p className="mt-1 text-xs opacity-70">
          Run code with numeric variables to see their history
        </p>
      </div>
    );
  }

  const graphHeight = 150;
  const graphWidth = 280;
  const paddingX = 30;
  const paddingY = 20;

  const scaleX = (index: number) =>
    paddingX + (index / (trace.length - 1 || 1)) * (graphWidth - paddingX * 2);
  const scaleY = (value: number) =>
    graphHeight -
    paddingY -
    ((value - minValue) / (maxValue - minValue || 1)) * (graphHeight - paddingY * 2);

  // Generate path for each variable
  const generatePath = (values: (number | null)[]) => {
    let path = '';
    let started = false;

    values.forEach((value, index) => {
      if (value !== null) {
        const x = scaleX(index);
        const y = scaleY(value);
        if (!started) {
          path += `M ${x} ${y}`;
          started = true;
        } else {
          path += ` L ${x} ${y}`;
        }
      }
    });

    return path;
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Variable Legend */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {variables.map((variable) => {
          const currentValue = variable.values[currentStepIndex];
          const prevValue = currentStepIndex > 0 ? variable.values[currentStepIndex - 1] : null;
          const trend =
            currentValue !== null && prevValue !== null
              ? currentValue > prevValue
                ? 'up'
                : currentValue < prevValue
                  ? 'down'
                  : 'same'
              : null;

          return (
            <Button
              key={variable.name}
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 px-2 font-mono text-xs ${
                variable.visible ? 'opacity-100' : 'opacity-40'
              }`}
              onClick={() => toggleVariable(variable.name)}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: variable.color }} />
              <span>{variable.name}</span>
              {currentValue !== null && (
                <>
                  <span className="text-muted-foreground">=</span>
                  <span style={{ color: variable.color }}>{currentValue}</span>
                  {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {trend === 'same' && <Minus className="text-muted-foreground h-3 w-3" />}
                </>
              )}
            </Button>
          );
        })}
      </div>

      {/* Graph */}
      <div className="bg-muted/20 border-border/30 relative flex-1 overflow-hidden rounded-lg border">
        <svg
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-border/30"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          <text
            x={paddingX - 5}
            y={paddingY}
            className="fill-muted-foreground text-[8px]"
            textAnchor="end"
          >
            {maxValue.toFixed(1)}
          </text>
          <text
            x={paddingX - 5}
            y={graphHeight - paddingY}
            className="fill-muted-foreground text-[8px]"
            textAnchor="end"
          >
            {minValue.toFixed(1)}
          </text>

          {/* Variable lines */}
          {variables.map(
            (variable) =>
              variable.visible && (
                <motion.path
                  key={variable.name}
                  d={generatePath(variable.values)}
                  fill="none"
                  stroke={variable.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              ),
          )}

          {/* Current step indicator */}
          <motion.line
            x1={scaleX(currentStepIndex)}
            y1={paddingY}
            x2={scaleX(currentStepIndex)}
            y2={graphHeight - paddingY}
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
          />

          {/* Current value dots */}
          {variables.map((variable) => {
            const value = variable.values[currentStepIndex];
            if (!variable.visible || value === null) return null;

            return (
              <motion.circle
                key={`dot-${variable.name}`}
                cx={scaleX(currentStepIndex)}
                cy={scaleY(value)}
                r="4"
                fill={variable.color}
                stroke="white"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            );
          })}
        </svg>

        {/* Step indicator */}
        <div className="text-muted-foreground bg-background/80 absolute right-2 bottom-1 rounded px-1.5 py-0.5 font-mono text-[10px]">
          Step {currentStepIndex + 1} / {trace.length}
        </div>
      </div>
    </div>
  );
}
