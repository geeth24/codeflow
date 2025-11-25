'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  detectDataStructure,
  DataStructureType,
  traverseLinkedList,
  traverseTree,
  TreeVisualization,
} from '@/lib/data-structure-detector';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Binary,
  GitBranch,
  Network,
  Box,
  Hash,
  Type,
  List,
} from 'lucide-react';

interface DataStructureVisualizerProps {
  name: string;
  value: unknown;
}

const TypeIcon = ({ type }: { type: DataStructureType }) => {
  switch (type) {
    case 'array':
      return <Layers className="h-3 w-3 text-yellow-500" />;
    case 'matrix':
      return <Binary className="h-3 w-3 text-orange-500" />;
    case 'linkedList':
      return <List className="h-3 w-3 text-blue-500" />;
    case 'tree':
      return <GitBranch className="h-3 w-3 text-green-500" />;
    case 'graph':
      return <Network className="h-3 w-3 text-purple-500" />;
    case 'object':
      return <Box className="h-3 w-3 text-cyan-500" />;
    case 'string':
      return <Type className="h-3 w-3 text-emerald-500" />;
    default:
      return <Hash className="h-3 w-3 text-gray-500" />;
  }
};

// Array Visualizer
function ArrayVisualizer({ value }: { value: unknown[] }) {
  const [expanded, setExpanded] = useState(value.length <= 10);
  const displayItems = expanded ? value : value.slice(0, 8);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {value.length} items
      </button>

      <div className="flex flex-wrap gap-1">
        {displayItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className="group relative"
          >
            <div className="flex h-8 min-w-[32px] items-center justify-center rounded border border-yellow-500/30 bg-yellow-500/10 px-2 font-mono text-xs">
              {typeof item === 'object' ? '{ }' : String(item)}
            </div>
            <div className="text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] opacity-0 transition-opacity group-hover:opacity-100">
              [{index}]
            </div>
          </motion.div>
        ))}
        {!expanded && value.length > 8 && (
          <div className="bg-muted/50 border-border/50 text-muted-foreground flex h-8 min-w-[32px] items-center justify-center rounded border px-2 text-xs">
            +{value.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}

// Matrix Visualizer
function MatrixVisualizer({ value }: { value: unknown[][] }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0.5 rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
        {value.slice(0, 8).map((row, i) => (
          <div key={i} className="flex gap-0.5">
            {(row as unknown[]).slice(0, 10).map((cell, j) => (
              <motion.div
                key={j}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (i * 10 + j) * 0.01 }}
                className="flex h-8 w-8 items-center justify-center rounded border border-orange-500/20 bg-orange-500/10 font-mono text-[10px]"
              >
                {typeof cell === 'number' ? cell : '·'}
              </motion.div>
            ))}
            {(row as unknown[]).length > 10 && (
              <div className="text-muted-foreground flex h-8 w-8 items-center justify-center text-[10px]">
                ...
              </div>
            )}
          </div>
        ))}
        {value.length > 8 && (
          <div className="text-muted-foreground py-1 text-center text-[10px]">
            ... {value.length - 8} more rows
          </div>
        )}
      </div>
    </div>
  );
}

// Linked List Visualizer
function LinkedListVisualizer({ value }: { value: unknown }) {
  const nodes = useMemo(() => traverseLinkedList(value), [value]);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {nodes.map((node, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center"
        >
          <div className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 font-mono text-sm">
            {String(node)}
          </div>
          {index < nodes.length - 1 && (
            <div className="relative h-0.5 w-6 bg-blue-500/50">
              <div className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-blue-500/50" />
            </div>
          )}
        </motion.div>
      ))}
      {nodes.length >= 20 && <div className="text-muted-foreground ml-2 text-xs">...</div>}
    </div>
  );
}

// Tree Node Component
function TreeNodeComponent({ node, depth = 0 }: { node: TreeVisualization; depth?: number }) {
  const hasChildren = node.left || node.right || (node.children && node.children.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: depth * 0.1 }}
      className="flex flex-col items-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10 font-mono text-sm shadow-[0_0_10px_rgba(34,197,94,0.2)]">
        {String(node.value)}
      </div>

      {hasChildren && (
        <div className="relative mt-2 flex gap-4">
          {/* Connection lines */}
          {(node.left || node.right) && (
            <div className="absolute top-0 left-1/2 h-4 w-full -translate-x-1/2">
              {node.left && (
                <div className="absolute top-0 left-1/4 h-4 w-1/4 rounded-bl-lg border-b-2 border-l-2 border-green-500/30" />
              )}
              {node.right && (
                <div className="absolute top-0 right-1/4 h-4 w-1/4 rounded-br-lg border-r-2 border-b-2 border-green-500/30" />
              )}
            </div>
          )}

          <div className="flex gap-8 pt-4">
            {node.left && <TreeNodeComponent node={node.left} depth={depth + 1} />}
            {node.right && <TreeNodeComponent node={node.right} depth={depth + 1} />}
            {node.children?.map((child, i) => (
              <TreeNodeComponent key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Tree Visualizer
function TreeVisualizer({ value }: { value: unknown }) {
  const tree = useMemo(() => traverseTree(value), [value]);

  if (!tree) {
    return <div className="text-muted-foreground text-xs">Empty tree</div>;
  }

  return (
    <div className="overflow-x-auto py-4">
      <div className="inline-block min-w-max">
        <TreeNodeComponent node={tree} />
      </div>
    </div>
  );
}

// Object Visualizer
function ObjectVisualizer({ value }: { value: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);
  const entries = Object.entries(value);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {entries.length} properties
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1 border-l-2 border-cyan-500/20 pl-3"
          >
            {entries.slice(0, 10).map(([key, val], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="font-medium text-cyan-500">{key}:</span>
                <span className="text-foreground max-w-[150px] truncate font-mono">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </motion.div>
            ))}
            {entries.length > 10 && (
              <div className="text-muted-foreground text-[10px]">+{entries.length - 10} more</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// String Visualizer
function StringVisualizer({ value }: { value: string }) {
  const displayValue = value.length > 50 ? value.slice(0, 50) + '...' : value;

  return (
    <div className="flex items-center gap-1">
      <span className="text-emerald-500">&quot;</span>
      <span className="text-foreground font-mono text-sm">{displayValue}</span>
      <span className="text-emerald-500">&quot;</span>
      {value.length > 50 && (
        <span className="text-muted-foreground ml-1 text-[10px]">({value.length} chars)</span>
      )}
    </div>
  );
}

export function DataStructureVisualizer({ name, value }: DataStructureVisualizerProps) {
  const structure = useMemo(() => detectDataStructure(value), [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-border/50 bg-muted/20 space-y-2 rounded-xl border p-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <TypeIcon type={structure.type} />
        <span className="text-muted-foreground text-xs font-medium">{name}</span>
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] capitalize">
          {structure.type}
        </span>
      </div>

      {/* Visualization */}
      <div className="overflow-hidden">
        {structure.type === 'array' && <ArrayVisualizer value={value as unknown[]} />}
        {structure.type === 'matrix' && <MatrixVisualizer value={value as unknown[][]} />}
        {structure.type === 'linkedList' && <LinkedListVisualizer value={value} />}
        {structure.type === 'tree' && <TreeVisualizer value={value} />}
        {structure.type === 'object' && (
          <ObjectVisualizer value={value as Record<string, unknown>} />
        )}
        {structure.type === 'string' && <StringVisualizer value={value as string} />}
        {structure.type === 'primitive' && <div className="font-mono text-sm">{String(value)}</div>}
      </div>
    </motion.div>
  );
}
