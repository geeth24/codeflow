const express = require('express');
const bodyParser = require('body-parser');
const ts = require('typescript');
const { traceExecution, instrumentCode } = require('./tracer');

const app = express();
app.use(bodyParser.json());

function transpileTypeScript(code) {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: false,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: false,
    }
  });
  return result.outputText;
}

app.post('/trace', async (req, res) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    let jsCode = code;
    if (language === 'typescript') {
      jsCode = transpileTypeScript(code);
    }
    const trace = await traceExecution(jsCode);
    res.json({ trace });
  } catch (e) {
    console.error(e);
    res.json({ trace: [], error: e.toString() });
  }
});

app.post('/debug', (req, res) => {
  const { code } = req.body;
  try {
    const instrumented = instrumentCode(code);
    res.json({ instrumented });
  } catch (e) {
    res.json({ error: e.toString() });
  }
});

app.listen(3000, () => {
  console.log('Node Runner listening on port 3000');
});


