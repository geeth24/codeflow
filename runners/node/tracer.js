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
        // Only capture primitives or simple objects to avoid circular refs/serialization issues
        if (typeof value === 'function') {
            locals[name] = `<function ${value.name || 'anonymous'}>`;
        } else if (typeof value === 'undefined') {
            // locals[name] = 'undefined'; // Skip undefined to keep noise down? Or show it?
            // Python tracer shows None.
            locals[name] = 'undefined';
        } else {
             locals[name] = value;
        }
      } catch (e) {
        // Variable likely in TDZ (Temporal Dead Zone) or not initialized
        // We just skip it
      }
    }

    // Capture simple stack trace
    // We can't easily get "main", "fibonacci" function names without more complex AST analysis of where we are.
    // But Error().stack might give us hints if named functions are used.
    const stackRaw = new Error().stack || '';
    // Filter stack to remove internal frames
    const stack = stackRaw.split('\n')
        .filter(l => !l.includes('__trace') && !l.includes('eval') && !l.includes('vm.js'))
        .map(l => l.trim().split(' ')[1] || 'anonymous')
        .slice(0, 5); // Limit depth

    trace.push({
      step: stepCounter,
      line: line,
      locals: JSON.parse(JSON.stringify(locals)), // Deep copy to snapshot state
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
