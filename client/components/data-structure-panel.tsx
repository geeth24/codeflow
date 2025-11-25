'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Network, Binary, GitBranch, Hash, Layers, List, Box, ChevronRight } from 'lucide-react';
import {
  detectDataStructure,
  traverseLinkedList,
  traverseTree,
  TreeVisualization,
} from '@/lib/data-structure-detector';

interface DataStructurePanelProps {
  isOpen: boolean;
  onClose: () => void;
  variables: Record<string, unknown>;
  allVariables?: Record<string, unknown>; // All variables from entire trace
}

// Enhanced Tree Visualization with better layout
function TreeViz({ node, depth = 0 }: { node: TreeVisualization; depth?: number }) {
  const hasChildren = node.left || node.right || (node.children && node.children.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: depth * 0.1 }}
      className="flex flex-col items-center"
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-full font-mono text-sm font-bold ${
          depth === 0
            ? 'bg-linear-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
            : 'border-2 border-green-500/40 bg-green-500/20 text-green-400'
        } `}
      >
        {String(node.value)}
        {depth === 0 && (
          <div className="text-muted-foreground absolute -top-6 text-[10px]">root</div>
        )}
      </div>

      {hasChildren && (
        <div className="relative mt-2">
          {/* Connector lines */}
          <svg
            className="absolute -top-2 left-1/2 -translate-x-1/2"
            width="200"
            height="30"
            style={{ overflow: 'visible' }}
          >
            {node.left && (
              <path
                d="M 100 0 Q 50 15 30 30"
                stroke="rgb(34 197 94 / 0.4)"
                strokeWidth="2"
                fill="none"
              />
            )}
            {node.right && (
              <path
                d="M 100 0 Q 150 15 170 30"
                stroke="rgb(34 197 94 / 0.4)"
                strokeWidth="2"
                fill="none"
              />
            )}
          </svg>

          <div className="flex gap-8 pt-6">
            {node.left ? (
              <TreeViz node={node.left} depth={depth + 1} />
            ) : node.right ? (
              <div className="border-muted-foreground/20 text-muted-foreground/40 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed text-xs">
                null
              </div>
            ) : null}

            {node.right ? (
              <TreeViz node={node.right} depth={depth + 1} />
            ) : node.left ? (
              <div className="border-muted-foreground/20 text-muted-foreground/40 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed text-xs">
                null
              </div>
            ) : null}

            {node.children?.map((child, i) => (
              <TreeViz key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Linked List Visualization
function LinkedListViz({ values }: { values: unknown[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.map((val, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center"
        >
          <div className="flex flex-col items-center">
            <div className="text-muted-foreground mb-1 text-[8px]">{i === 0 ? 'head' : ''}</div>
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-blue-500/40 bg-blue-500/20">
              <div className="font-mono text-sm font-bold text-blue-400">{String(val)}</div>
              <div className="text-muted-foreground text-[8px]">next →</div>
            </div>
          </div>
          {i < values.length - 1 && (
            <div className="relative mx-1 h-0.5 w-6 bg-blue-500/40">
              <div className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-blue-500/60" />
            </div>
          )}
        </motion.div>
      ))}
      <div className="border-muted-foreground/20 text-muted-foreground/40 ml-2 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed text-xs">
        null
      </div>
    </div>
  );
}

// HashMap/Object Visualization
function HashMapViz({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground grid grid-cols-2 gap-2 px-2 text-[10px]">
        <div>Key</div>
        <div>Value</div>
      </div>
      <div className="space-y-1">
        {entries.map(([key, value], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-stretch overflow-hidden rounded-lg border border-purple-500/30"
          >
            <div className="flex flex-1 items-center bg-purple-500/20 px-3 py-2 font-mono text-sm text-purple-400">
              &quot;{key}&quot;
            </div>
            <div className="flex w-8 items-center justify-center bg-purple-500/10">
              <ChevronRight className="h-4 w-4 text-purple-500/50" />
            </div>
            <div className="text-foreground flex flex-1 items-center bg-purple-500/5 px-3 py-2 font-mono text-sm">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Array Visualization with indices
function ArrayViz({ data }: { data: unknown[] }) {
  const isMatrix = data.length > 0 && Array.isArray(data[0]);

  if (isMatrix) {
    return (
      <div className="space-y-1">
        {(data as unknown[][]).slice(0, 10).map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1"
          >
            <div className="text-muted-foreground w-6 pr-1 text-right text-[10px]">{i}</div>
            {row.slice(0, 12).map((cell, j) => (
              <div
                key={j}
                className="flex h-10 w-10 items-center justify-center rounded border border-orange-500/30 bg-orange-500/20 font-mono text-xs"
              >
                {typeof cell === 'number' ? cell : '·'}
              </div>
            ))}
            {row.length > 12 && <div className="text-muted-foreground text-xs">...</div>}
          </motion.div>
        ))}
        {data.length > 10 && (
          <div className="text-muted-foreground py-2 text-center text-xs">
            ... {data.length - 10} more rows
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {data.slice(0, 20).map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className="flex flex-col items-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-yellow-500/30 bg-yellow-500/20 font-mono text-sm">
              {typeof item === 'object' ? '{}' : String(item)}
            </div>
            <div className="text-muted-foreground mt-1 text-[9px]">[{i}]</div>
          </motion.div>
        ))}
        {data.length > 20 && (
          <div className="bg-muted/30 border-border/50 text-muted-foreground flex h-12 w-12 items-center justify-center rounded-lg border text-xs">
            +{data.length - 20}
          </div>
        )}
      </div>
    </div>
  );
}

// Graph Visualization (adjacency list style)
function GraphViz({ data }: { data: Record<string, unknown> }) {
  // Try to interpret as adjacency list
  const nodes = Object.keys(data);

  return (
    <div className="relative p-4">
      <svg className="h-64 w-full" viewBox="0 0 400 250">
        {/* Draw nodes in a circle */}
        {nodes.slice(0, 8).map((node, i) => {
          const angle = (i / Math.min(nodes.length, 8)) * 2 * Math.PI - Math.PI / 2;
          const x = 200 + Math.cos(angle) * 100;
          const y = 125 + Math.sin(angle) * 80;

          // Draw edges
          const neighbors = data[node];
          const edges: React.ReactNode[] = [];
          if (Array.isArray(neighbors)) {
            neighbors.forEach((neighbor, j) => {
              const neighborIndex = nodes.indexOf(String(neighbor));
              if (neighborIndex !== -1 && neighborIndex < 8) {
                const neighborAngle =
                  (neighborIndex / Math.min(nodes.length, 8)) * 2 * Math.PI - Math.PI / 2;
                const x2 = 200 + Math.cos(neighborAngle) * 100;
                const y2 = 125 + Math.sin(neighborAngle) * 80;
                edges.push(
                  <line
                    key={`${node}-${neighbor}-${j}`}
                    x1={x}
                    y1={y}
                    x2={x2}
                    y2={y2}
                    stroke="rgb(168 85 247 / 0.3)"
                    strokeWidth="2"
                  />,
                );
              }
            });
          }

          return (
            <g key={node}>
              {edges}
              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                cx={x}
                cy={y}
                r="24"
                fill="rgb(168 85 247 / 0.2)"
                stroke="rgb(168 85 247 / 0.6)"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-purple-400 font-mono text-sm font-bold"
              >
                {node}
              </text>
            </g>
          );
        })}
      </svg>
      {nodes.length > 8 && (
        <div className="text-muted-foreground text-center text-xs">
          Showing 8 of {nodes.length} nodes
        </div>
      )}
    </div>
  );
}

// Main visualization component
function VariableVisualization({ name, value }: { name: string; value: unknown }) {
  const structure = useMemo(() => detectDataStructure(value), [value]);

  // Use extracted root if available (for wrapper classes like BinaryTree)
  const valueToVisualize = structure.extractedRoot || structure.value;

  const getIcon = () => {
    switch (structure.type) {
      case 'tree':
        return <GitBranch className="h-4 w-4 text-green-500" />;
      case 'linkedList':
        return <List className="h-4 w-4 text-blue-500" />;
      case 'array':
        return <Layers className="h-4 w-4 text-yellow-500" />;
      case 'matrix':
        return <Binary className="h-4 w-4 text-orange-500" />;
      case 'graph':
        return <Network className="h-4 w-4 text-purple-500" />;
      case 'object':
        return <Hash className="h-4 w-4 text-purple-500" />;
      default:
        return <Box className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderVisualization = () => {
    switch (structure.type) {
      case 'tree':
        const tree = traverseTree(valueToVisualize);
        return tree ? (
          <TreeViz node={tree} />
        ) : (
          <div className="text-muted-foreground">Empty tree</div>
        );

      case 'linkedList':
        const listValues = traverseLinkedList(valueToVisualize);
        return <LinkedListViz values={listValues} />;

      case 'array':
      case 'matrix':
        return <ArrayViz data={valueToVisualize as unknown[]} />;

      case 'graph':
        return <GraphViz data={valueToVisualize as Record<string, unknown>} />;

      case 'object':
        // Check if it looks like a graph (adjacency list)
        const obj = valueToVisualize as Record<string, unknown>;
        const hasArrayValues = Object.values(obj).some((v) => Array.isArray(v));
        if (hasArrayValues && Object.keys(obj).length > 1) {
          return <GraphViz data={obj} />;
        }
        return <HashMapViz data={obj} />;

      default:
        return (
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
            {JSON.stringify(valueToVisualize, null, 2)}
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-border/50 bg-card/50 space-y-3 rounded-xl border p-4"
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="font-mono font-medium">{name}</span>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs capitalize">
          {structure.type}
        </span>
        {structure.metadata?.className && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
            {structure.metadata.className}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">{renderVisualization()}</div>
    </motion.div>
  );
}

export function DataStructurePanel({
  isOpen,
  onClose,
  variables,
  allVariables,
}: DataStructurePanelProps) {
  // Use allVariables if provided, otherwise fall back to current variables
  const varsToShow =
    allVariables && Object.keys(allVariables).length > 0 ? allVariables : variables;

  const visualizableVars = useMemo(() => {
    return Object.entries(varsToShow).filter(([key, value]) => {
      if (key.startsWith('_')) return false;
      if (typeof value === 'object' && value !== null) return true;
      if (Array.isArray(value)) return true;
      return false;
    });
  }, [varsToShow]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl"
          >
            <div className="bg-card border-border flex h-full flex-col border-l shadow-2xl">
              {/* Header */}
              <div className="border-border/50 flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Data Structures</h2>
                    <p className="text-muted-foreground text-xs">
                      Visualize arrays, trees, graphs & more
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4 p-4">
                  {visualizableVars.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="bg-muted/50 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                        <Network className="text-muted-foreground/50 h-10 w-10" />
                      </div>
                      <h3 className="mb-2 text-lg font-medium">No Data Structures</h3>
                      <p className="text-muted-foreground max-w-sm text-sm">
                        Run code with arrays, objects, trees, or linked lists to see them visualized
                        here.
                      </p>
                      <div className="bg-muted/30 mt-6 rounded-lg p-4 text-left">
                        <p className="text-muted-foreground mb-2 text-xs">Try code like:</p>
                        <pre className="text-foreground font-mono text-xs">
                          {`# Binary Tree
root = {"val": 1, "left": {"val": 2}, "right": {"val": 3}}

# Linked List  
head = {"val": 1, "next": {"val": 2, "next": {"val": 3}}}

# Graph (adjacency list)
graph = {"A": ["B", "C"], "B": ["A", "D"], "C": ["A"]}`}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    visualizableVars.map(([name, value]) => (
                      <VariableVisualization key={name} name={name} value={value} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
