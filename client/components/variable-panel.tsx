'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Hash, Box, Layers, ChevronRight } from 'lucide-react';

interface VariablePanelProps {
  variables: Record<string, unknown>;
}

const getTypeIcon = (value: unknown) => {
  if (typeof value === 'number') return <Hash className="h-3 w-3 text-blue-400" />;
  if (typeof value === 'string') return <Activity className="h-3 w-3 text-green-400" />;
  if (Array.isArray(value)) return <Layers className="h-3 w-3 text-yellow-400" />;
  if (typeof value === 'object') return <Box className="h-3 w-3 text-purple-400" />;
  return <Activity className="h-3 w-3 text-gray-400" />;
};

const getTypeColor = (value: unknown) => {
  if (typeof value === 'number') return 'text-blue-400';
  if (typeof value === 'string') return 'text-green-400';
  if (typeof value === 'boolean') return 'text-orange-400';
  if (Array.isArray(value)) return 'text-yellow-400';
  if (typeof value === 'object' && value !== null) return 'text-purple-400';
  return 'text-muted-foreground';
};

const formatValue = (value: unknown, expanded: boolean = false): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (expanded) return JSON.stringify(value, null, 2);
    if (value.length === 0) return '[]';
    if (value.length <= 3) return `[${value.map((v) => formatValue(v)).join(', ')}]`;
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    if (expanded) return JSON.stringify(value, null, 2);
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      const preview = keys
        .slice(0, 2)
        .map((k) => `${k}: ...`)
        .join(', ');
      return `{${preview}}`;
    }
    return `{${keys.length} keys}`;
  }
  return String(value);
};

// Check if value is expandable
const isExpandable = (value: unknown): boolean => {
  if (Array.isArray(value) && value.length > 0) return true;
  if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) return true;
  return false;
};

export function VariablePanel({ variables }: VariablePanelProps) {
  // Track which variables user has manually collapsed
  const [collapsedVars, setCollapsedVars] = useState<Set<string>>(new Set());

  // All expandable variables are expanded by default, unless user collapsed them
  const expandedVars = useMemo(() => {
    const expanded = new Set<string>();
    Object.entries(variables).forEach(([key, value]) => {
      if (isExpandable(value) && !collapsedVars.has(key)) {
        expanded.add(key);
      }
    });
    return expanded;
  }, [variables, collapsedVars]);

  const toggleExpanded = (key: string) => {
    setCollapsedVars((prev) => {
      const next = new Set(prev);
      if (expandedVars.has(key)) {
        // Currently expanded, so collapse it
        next.add(key);
      } else {
        // Currently collapsed, so expand it
        next.delete(key);
      }
      return next;
    });
  };

  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full items-center justify-center"
      >
        <div className="text-muted-foreground text-center text-sm">
          <Box className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No variables in scope
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      <AnimatePresence mode="popLayout">
        {entries.map(([key, value]) => {
          const isExpanded = expandedVars.has(key);
          const canExpand = isExpandable(value);

          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                layout: { duration: 0.2 },
              }}
              className="group border-border/50 bg-muted/30 hover:bg-muted/50 relative overflow-hidden rounded-xl border transition-colors"
            >
              {/* Gradient hover effect */}
              <div className="from-primary/10 absolute inset-0 bg-linear-to-r to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Main content */}
              <div
                className={`relative flex items-start justify-between gap-4 p-3 ${canExpand ? 'cursor-pointer' : ''}`}
                onClick={() => canExpand && toggleExpanded(key)}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    {canExpand && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </motion.div>
                    )}
                    {getTypeIcon(value)}
                    <span className="truncate">{key}</span>
                  </div>
                  {!isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`truncate font-mono text-sm ${getTypeColor(value)}`}
                    >
                      {formatValue(value)}
                    </motion.div>
                  )}
                </div>
                <div className="text-muted-foreground/50 font-mono text-[10px]">
                  {Array.isArray(value) ? 'array' : typeof value}
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && canExpand && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="relative overflow-hidden"
                  >
                    <pre
                      className={`bg-background/50 border-border/30 mx-3 mb-3 max-h-48 overflow-auto rounded-lg border p-3 font-mono text-xs ${getTypeColor(value)}`}
                    >
                      {formatValue(value, true)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
