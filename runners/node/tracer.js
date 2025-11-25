const acorn = require('acorn');
const vm = require('vm');

function walk(node, { enter }, parent = null, parentKey = null) {
  if (!node || typeof node !== 'object') return;
  enter(node, parent, parentKey);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(c => walk(c, { enter }, node, key));
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, { enter }, node, key);
    }
  }
}

/**
 * Recursively serialize a JavaScript value to JSON-compatible format.
 * Handles class instances, circular references, and complex objects.
 */
function serializeValue(value, depth = 0, maxDepth = 5, seen = new WeakSet()) {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return '<max depth>';
  }
  
  // Handle primitives
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    return value;
  }
  if (typeof value === 'string') {
    return value.length > 200 ? value.slice(0, 200) + '...' : value;
  }
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return value.toString() + 'n';
  
  // Handle functions
  if (typeof value === 'function') {
    return `<function ${value.name || 'anonymous'}>`;
  }
  
  // Check for circular references
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '<circular>';
    }
    seen.add(value);
  }
  
  try {
    // Handle arrays
    if (Array.isArray(value)) {
      const result = [];
      const limit = Math.min(value.length, 20);
      for (let i = 0; i < limit; i++) {
        result.push(serializeValue(value[i], depth + 1, maxDepth, seen));
      }
      if (value.length > 20) {
        result.push(`... +${value.length - 20} more`);
      }
      return result;
    }
    
    // Handle Map
    if (value instanceof Map) {
      const obj = {};
      let count = 0;
      for (const [k, v] of value) {
        if (count >= 20) break;
        obj[String(k)] = serializeValue(v, depth + 1, maxDepth, seen);
        count++;
      }
      return obj;
    }
    
    // Handle Set
    if (value instanceof Set) {
      return serializeValue([...value], depth + 1, maxDepth, seen);
    }
    
    // Handle Date
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle RegExp
    if (value instanceof RegExp) {
      return value.toString();
    }
    
    // Handle Error
    if (value instanceof Error) {
      return { error: value.message, stack: value.stack?.split('\n').slice(0, 3) };
    }
    
    // Handle plain objects and class instances
    if (typeof value === 'object') {
      const result = {};
      const keys = Object.keys(value);
      const limit = Math.min(keys.length, 20);
      
      for (let i = 0; i < limit; i++) {
        const key = keys[i];
        if (key.startsWith('__')) continue;
        try {
          result[key] = serializeValue(value[key], depth + 1, maxDepth, seen);
        } catch (e) {
          result[key] = '<error>';
        }
      }
      
      // For class instances, also check for common data structure properties
      const specialProps = ['val', 'value', 'data', 'key', 'left', 'right', 'next', 'prev', 'children', 'root', 'head'];
      for (const prop of specialProps) {
        if (prop in value && !(prop in result)) {
          try {
            result[prop] = serializeValue(value[prop], depth + 1, maxDepth, seen);
          } catch (e) {
            // Skip if can't serialize
          }
        }
      }
      
      return result;
    }
    
    return `<${typeof value}>`;
  } catch (e) {
    return `<error: ${e.message?.slice(0, 50) || 'unknown'}>`;
  }
}

async function traceExecution(code) {
  const trace = [];
  let stepCounter = 0;

  // Define the trace hook that will be available in the sandbox
  const traceCallback = (line, evalFunc, varNames) => {
    stepCounter++;
    
    // Capture locals using the injected eval function (which runs in user scope)
    const locals = {};
    for (const name of varNames) {
      try {
        const value = evalFunc(name);
        // Use our custom serializer to properly handle class instances
        locals[name] = serializeValue(value);
      } catch (e) {
        // Variable likely in TDZ (Temporal Dead Zone) or not initialized
        // We just skip it
      }
    }

    // Capture simple stack trace
    const stackRaw = new Error().stack || '';
    // Filter stack to remove internal frames
    const stack = stackRaw.split('\n')
        .filter(l => !l.includes('__trace') && !l.includes('eval') && !l.includes('vm.js'))
        .map(l => l.trim().split(' ')[1] || 'anonymous')
        .slice(0, 5); // Limit depth

    trace.push({
      step: stepCounter,
      line: line,
      locals: locals, // Already serialized, no need for JSON.parse/stringify
      stack: stack.length ? stack : ['main']
    });
  };

  // 1. Parse Code
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2020, locations: true });
  } catch (e) {
    throw new Error(`Syntax Error: ${e.message}`);
  }

  // 2. Collect all declared variable/function names to track
  const declaredVars = new Set();
  walk(ast, {
    enter(node) {
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
        declaredVars.add(node.id.name);
      }
      if (node.type === 'FunctionDeclaration' && node.id) {
        declaredVars.add(node.id.name);
      }
      // Catch function arguments too!
      if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')) {
          node.params.forEach(param => {
              if (param.type === 'Identifier') declaredVars.add(param.name);
          });
      }
    }
  });
  const varsList = Array.from(declaredVars);
  const varsJson = JSON.stringify(varsList);

  // 3. Instrument Code: Insert __trace call before every statement
  // Skip compound statements (for, while, if, etc.) - only instrument their bodies
  const skipTypes = new Set([
    'BlockStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
    'WhileStatement', 'DoWhileStatement', 'IfStatement', 'SwitchStatement',
    'TryStatement', 'WithStatement', 'FunctionDeclaration'
  ]);
  
  // Track nodes inside for loop init/update/test to skip them
  const forLoopParts = new Set(['init', 'test', 'update', 'left', 'right']);
  
  const nodesToInstrument = [];
  walk(ast, {
    enter(node, parent, parentKey) {
        // Skip VariableDeclarations inside for loop headers
        if (node.type === 'VariableDeclaration') {
          if (parent && forLoopParts.has(parentKey)) {
            return; // Skip - this is inside for(let i=0; ...)
          }
          nodesToInstrument.push(node);
        } else if (node.type.endsWith('Statement') && !skipTypes.has(node.type)) {
          nodesToInstrument.push(node);
        }
    }
  });
  
  // Sort descending by start position
  nodesToInstrument.sort((a, b) => b.start - a.start);

  let instrumentedCode = code;
  for (const node of nodesToInstrument) {
      if (!node.loc) continue;
      const line = node.loc.start.line;
      const traceCall = `__trace(${line}, (n)=>eval(n), ${varsJson});`;
      instrumentedCode = instrumentedCode.slice(0, node.start) + traceCall + instrumentedCode.slice(node.start);
  }

  // 4. Run in Sandbox
  const sandbox = {
    console: { log: () => {} }, // Swallow console logs or capture them?
    __trace: traceCallback
  };
  
  vm.createContext(sandbox);
  
  try {
    vm.runInContext(instrumentedCode, sandbox);
  } catch (e) {
      // Capture runtime errors
       trace.push({
        step: stepCounter + 1,
        line: -1,
        locals: { error: e.toString() },
        stack: ['error']
      });
  }

  return trace;
}

function instrumentCode(code) {
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2020, locations: true });
  } catch (e) {
    throw new Error(`Syntax Error: ${e.message}`);
  }

  const declaredVars = new Set();
  walk(ast, {
    enter(node) {
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
        declaredVars.add(node.id.name);
      }
      if (node.type === 'FunctionDeclaration' && node.id) {
        declaredVars.add(node.id.name);
      }
      if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')) {
        node.params.forEach(param => {
          if (param.type === 'Identifier') declaredVars.add(param.name);
        });
      }
    }
  });
  const varsList = Array.from(declaredVars);
  const varsJson = JSON.stringify(varsList);

  const skipTypes = new Set([
    'BlockStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
    'WhileStatement', 'DoWhileStatement', 'IfStatement', 'SwitchStatement',
    'TryStatement', 'WithStatement', 'FunctionDeclaration'
  ]);
  
  const forLoopParts = new Set(['init', 'test', 'update', 'left', 'right']);
  
  const nodesToInstrument = [];
  walk(ast, {
    enter(node, parent, parentKey) {
      if (node.type === 'VariableDeclaration') {
        if (parent && forLoopParts.has(parentKey)) {
          return;
        }
        nodesToInstrument.push(node);
      } else if (node.type.endsWith('Statement') && !skipTypes.has(node.type)) {
        nodesToInstrument.push(node);
      }
    }
  });
  
  nodesToInstrument.sort((a, b) => b.start - a.start);

  let instrumentedCode = code;
  for (const node of nodesToInstrument) {
    if (!node.loc) continue;
    const line = node.loc.start.line;
    const traceCall = `__trace(${line}, (n)=>eval(n), ${varsJson});`;
    instrumentedCode = instrumentedCode.slice(0, node.start) + traceCall + instrumentedCode.slice(node.start);
  }

  return instrumentedCode;
}

module.exports = { traceExecution, instrumentCode };
