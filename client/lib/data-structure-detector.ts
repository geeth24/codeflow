export type DataStructureType =
  | 'array'
  | 'matrix'
  | 'linkedList'
  | 'tree'
  | 'graph'
  | 'object'
  | 'primitive'
  | 'string';

export interface DetectedStructure {
  type: DataStructureType;
  value: unknown;
  depth: number;
  extractedRoot?: unknown; // The actual root node if this is a wrapper class
  metadata?: {
    dimensions?: number[];
    nodeCount?: number;
    hasLeft?: boolean;
    hasRight?: boolean;
    hasNext?: boolean;
    hasChildren?: boolean;
    className?: string;
  };
}

// Check if value looks like a linked list node (direct or nested)
function isLinkedListNode(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Direct node: has next/prev and a value field
  const hasNextPrev = 'next' in obj || 'prev' in obj;
  const hasValue = 'val' in obj || 'value' in obj || 'data' in obj;

  if (hasNextPrev && hasValue) return true;

  // Also check if next points to another object (even if no explicit value field)
  if (hasNextPrev && typeof obj.next === 'object') return true;

  return false;
}

// Check if value looks like a tree node (direct or nested)
function isTreeNode(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Direct node: has left/right/children and a value field
  const hasTreeStructure = 'left' in obj || 'right' in obj || 'children' in obj;
  const hasValue = 'val' in obj || 'value' in obj || 'data' in obj || 'key' in obj;

  if (hasTreeStructure && hasValue) return true;

  // Also check if left/right point to objects (even without explicit value)
  if (hasTreeStructure && (typeof obj.left === 'object' || typeof obj.right === 'object')) {
    return true;
  }

  return false;
}

// Check if value looks like a graph node
function isGraphNode(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    ('neighbors' in obj || 'edges' in obj || 'adjacent' in obj || 'adjacency' in obj) &&
    ('val' in obj || 'value' in obj || 'id' in obj || 'data' in obj || 'nodes' in obj)
  );
}

// Check if object is a wrapper class containing a tree/list (like BinaryTree with .root)
function findNestedStructure(value: unknown): {
  type: 'tree' | 'linkedList' | 'graph' | null;
  root: unknown;
} {
  if (typeof value !== 'object' || value === null) {
    return { type: null, root: null };
  }

  const obj = value as Record<string, unknown>;

  // Common wrapper patterns: .root for trees, .head for linked lists
  if ('root' in obj && typeof obj.root === 'object' && obj.root !== null) {
    if (isTreeNode(obj.root)) {
      return { type: 'tree', root: obj.root };
    }
  }

  if ('head' in obj && typeof obj.head === 'object' && obj.head !== null) {
    if (isLinkedListNode(obj.head)) {
      return { type: 'linkedList', root: obj.head };
    }
  }

  // Check for graph wrappers
  if ('nodes' in obj || 'vertices' in obj || 'adjacency' in obj || 'adj' in obj) {
    return { type: 'graph', root: obj.nodes || obj.vertices || obj.adjacency || obj.adj || obj };
  }

  return { type: null, root: null };
}

// Check if array is a matrix (2D array)
function isMatrix(value: unknown[]): boolean {
  if (value.length === 0) return false;
  return value.every((row) => Array.isArray(row) && row.length > 0);
}

// Get array dimensions
function getArrayDimensions(value: unknown[]): number[] {
  const dims: number[] = [value.length];
  if (value.length > 0 && Array.isArray(value[0])) {
    dims.push((value[0] as unknown[]).length);
  }
  return dims;
}

export function detectDataStructure(value: unknown, depth = 0): DetectedStructure {
  // Primitives
  if (value === null || value === undefined) {
    return { type: 'primitive', value, depth };
  }

  if (typeof value === 'string') {
    return { type: 'string', value, depth };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { type: 'primitive', value, depth };
  }

  // Arrays
  if (Array.isArray(value)) {
    if (isMatrix(value)) {
      return {
        type: 'matrix',
        value,
        depth,
        metadata: {
          dimensions: getArrayDimensions(value),
        },
      };
    }
    return {
      type: 'array',
      value,
      depth,
      metadata: {
        dimensions: [value.length],
      },
    };
  }

  // Objects - check for special structures
  if (typeof value === 'object') {
    // First check if it's a direct tree/list node
    if (isLinkedListNode(value)) {
      return {
        type: 'linkedList',
        value,
        depth,
        metadata: {
          hasNext: 'next' in (value as object),
        },
      };
    }

    if (isTreeNode(value)) {
      const obj = value as Record<string, unknown>;
      return {
        type: 'tree',
        value,
        depth,
        metadata: {
          hasLeft: 'left' in obj,
          hasRight: 'right' in obj,
          hasChildren: 'children' in obj,
        },
      };
    }

    if (isGraphNode(value)) {
      return {
        type: 'graph',
        value,
        depth,
      };
    }

    // Check if it's a wrapper class (like BinaryTree with .root, LinkedList with .head)
    const nested = findNestedStructure(value);
    if (nested.type && nested.root) {
      const obj = value as Record<string, unknown>;
      // Try to get class name from __class__ or constructor
      const className = (obj.__class__ as string) || (obj.constructor?.name as string) || undefined;

      if (nested.type === 'tree') {
        return {
          type: 'tree',
          value: nested.root, // Use the actual root node for visualization
          extractedRoot: nested.root,
          depth,
          metadata: {
            hasLeft: 'left' in (nested.root as object),
            hasRight: 'right' in (nested.root as object),
            hasChildren: 'children' in (nested.root as object),
            className,
          },
        };
      }

      if (nested.type === 'linkedList') {
        return {
          type: 'linkedList',
          value: nested.root,
          extractedRoot: nested.root,
          depth,
          metadata: {
            hasNext: 'next' in (nested.root as object),
            className,
          },
        };
      }

      if (nested.type === 'graph') {
        return {
          type: 'graph',
          value: nested.root,
          extractedRoot: nested.root,
          depth,
          metadata: { className },
        };
      }
    }

    // Check if any property contains a tree or list (deep search)
    const obj = value as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_')) continue;
      if (typeof val === 'object' && val !== null) {
        if (isTreeNode(val)) {
          return {
            type: 'tree',
            value: val,
            extractedRoot: val,
            depth,
            metadata: {
              hasLeft: 'left' in val,
              hasRight: 'right' in val,
              className: key, // Use the property name as hint
            },
          };
        }
        if (isLinkedListNode(val)) {
          return {
            type: 'linkedList',
            value: val,
            extractedRoot: val,
            depth,
            metadata: {
              hasNext: 'next' in val,
              className: key,
            },
          };
        }
      }
    }

    // Generic object - but check if it looks like an adjacency list (graph)
    const keys = Object.keys(obj);
    const hasArrayValues = Object.values(obj).some((v) => Array.isArray(v));
    if (hasArrayValues && keys.length > 1 && keys.every((k) => !k.startsWith('_'))) {
      // Might be an adjacency list
      return { type: 'graph', value, depth };
    }

    return { type: 'object', value, depth };
  }

  return { type: 'primitive', value, depth };
}

// Get the value from a node (handles val, value, data)
export function getNodeValue(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) return node;
  const obj = node as Record<string, unknown>;
  return obj.val ?? obj.value ?? obj.data ?? obj.id ?? '?';
}

// Traverse linked list to get all values
export function traverseLinkedList(head: unknown, maxNodes = 20): unknown[] {
  const values: unknown[] = [];
  let current = head;
  let count = 0;

  while (current && typeof current === 'object' && count < maxNodes) {
    values.push(getNodeValue(current));
    current = (current as Record<string, unknown>).next;
    count++;
  }

  return values;
}

// Traverse tree to get structure for visualization
export interface TreeVisualization {
  value: unknown;
  left?: TreeVisualization | null;
  right?: TreeVisualization | null;
  children?: TreeVisualization[];
}

export function traverseTree(
  node: unknown,
  maxDepth = 5,
  currentDepth = 0,
): TreeVisualization | null {
  if (!node || typeof node !== 'object' || currentDepth >= maxDepth) {
    return null;
  }

  const obj = node as Record<string, unknown>;
  const result: TreeVisualization = {
    value: getNodeValue(node),
  };

  if ('left' in obj || 'right' in obj) {
    result.left = traverseTree(obj.left, maxDepth, currentDepth + 1);
    result.right = traverseTree(obj.right, maxDepth, currentDepth + 1);
  }

  if ('children' in obj && Array.isArray(obj.children)) {
    result.children = obj.children
      .map((child) => traverseTree(child, maxDepth, currentDepth + 1))
      .filter((c): c is TreeVisualization => c !== null);
  }

  return result;
}
