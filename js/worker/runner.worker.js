// js/worker/runner.worker.js - Dedicated Web Worker for Pyodide Execution
/* global importScripts, loadPyodide */

let pyodide = null;
let isInitializing = false;
let inputRequestIdCounter = 0;
const inputResolvers = new Map();

self.requestInputFromMain = function(promptText) {
  return new Promise((resolve) => {
    const id = ++inputRequestIdCounter;
    inputResolvers.set(id, resolve);
    postMessage({ type: 'request-input', id, prompt: promptText || '' });
  });
};

// Cloudflare Worker CORS Proxy for outgoing HTTP requests from Pyodide
const CF_PROXY_URL = 'https://crimson-glade-8f31.rahmatullin-ilnur-17021992.workers.dev/?url=';

async function initPyodide() {
  if (pyodide) return pyodide;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return pyodide;
  }

  isInitializing = true;
  postMessage({ type: 'status', status: 'loading', message: 'Загрузка Pyodide (WASM)...' });

  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');

    pyodide = await loadPyodide({
      stdout: (text) => {
        postMessage({ type: 'stdout', text: text + '\n' });
      },
      stderr: (text) => {
        postMessage({ type: 'stderr', text: text + '\n' });
      }
    });

    // Expose requestInputFromMain to Python via JS module
    await pyodide.runPythonAsync(`
import sys
import os
import ast
import json
import io
import types
import builtins
import js

if "/workspace" not in sys.path:
    sys.path.insert(0, "/workspace")

async def __custom_async_input__(prompt=""):
    prompt_str = str(prompt) if prompt is not None else ""
    if prompt_str:
        sys.stdout.write(prompt_str)
    val = await js.requestInputFromMain(prompt_str)
    if val is None:
        raise EOFError("Ввод отменен пользователем")
    val_str = str(val)
    sys.stdout.write(val_str + "\\n")
    return val_str

builtins.__custom_async_input__ = __custom_async_input__

# Настройка HTTP-клиента с автоматическим проксированием через Cloudflare Worker
import urllib.request
import urllib.error
import urllib.parse
from http.client import HTTPResponse
from io import BytesIO
from email.parser import Parser
import js

_CF_PROXY_BASE_URL = "${CF_PROXY_URL}"

class _PyodideFakeSocket:
    def __init__(self, data: bytes):
        self.data = data

    def makefile(self, mode="r", *args, **kwargs):
        return BytesIO(self.data)

def _pyodide_urlopen(url, data=None, timeout=None, *args, **kwargs):
    method = "GET"
    headers = {}
    body = data

    if isinstance(url, urllib.request.Request):
        req_obj = url
        method = req_obj.get_method()
        body = req_obj.data
        headers = dict(req_obj.header_items())
        target_url = req_obj.full_url
    else:
        target_url = str(url)
        if body is not None:
            method = "POST"

    if (target_url.startswith("http://") or target_url.startswith("https://")) and not target_url.startswith(_CF_PROXY_BASE_URL):
        fetch_url = _CF_PROXY_BASE_URL + urllib.parse.quote(target_url, safe="")
    else:
        fetch_url = target_url

    try:
        xhr = js.eval("new (self.XMLHttpRequest || globalThis.XMLHttpRequest)()")
    except Exception as e:
        raise urllib.error.URLError(f"Failed to instantiate XMLHttpRequest: {e}")

    xhr.responseType = "arraybuffer"
    if timeout and isinstance(timeout, (int, float)) and timeout > 0:
        xhr.timeout = int(timeout * 1000)

    try:
        xhr.open(method, fetch_url, False)
    except Exception as e:
        raise urllib.error.URLError(f"Failed to open request: {e}")

    restricted_headers = {"host", "user-agent", "origin", "referer", "content-length", "cookie"}
    for k, v in headers.items():
        if k.lower() not in restricted_headers:
            try:
                xhr.setRequestHeader(k, str(v))
            except Exception:
                pass

    try:
        if body is not None:
            if isinstance(body, str):
                b = body.encode("utf-8")
            else:
                b = bytes(body)
            js_bytes = js.eval(f"new Uint8Array({list(b)})")
            xhr.send(js_bytes)
        else:
            xhr.send(None)
    except Exception as e:
        raise urllib.error.URLError(f"Network error or request blocked by browser: {e}")

    status_code = int(xhr.status or 0)
    if status_code == 0:
        raise urllib.error.URLError("Network request failed or was blocked by browser policy")

    status_text = xhr.statusText or "OK"
    raw_headers = xhr.getAllResponseHeaders() or ""
    parsed_headers = dict(Parser().parsestr(raw_headers))
    headers_clean = {k: v for k, v in parsed_headers.items() if k.lower() != "content-length"}

    resp_bytes = b""
    if xhr.response:
        resp_bytes = bytes(xhr.response.to_py())

    fake_http_data = (
        f"HTTP/1.1 {status_code} {status_text}\\r\\n".encode("latin-1")
        + "\\r\\n".join(f"{k}: {v}" for k, v in headers_clean.items()).encode("latin-1")
        + b"\\r\\n\\r\\n"
        + resp_bytes
    )

    response = HTTPResponse(_PyodideFakeSocket(fake_http_data))
    response.url = target_url
    response.begin()

    if status_code >= 400:
        raise urllib.error.HTTPError(
            target_url, status_code, status_text, response.headers, response
        )

    return response

urllib.request.urlopen = _pyodide_urlopen
urllib.request.OpenerDirector.open = lambda self, fullurl, data=None, timeout=None, *a, **kw: _pyodide_urlopen(fullurl, data=data, timeout=timeout, *a, **kw)


def _check_python_syntax(code_str, filename="<input>"):
    try:
        ast.parse(code_str, filename=filename)
        return json.dumps([])
    except SyntaxError as e:
        lineno = e.lineno or 1
        offset = e.offset or 1
        end_lineno = getattr(e, 'end_lineno', None) or lineno
        end_offset = getattr(e, 'end_offset', None)
        if end_offset is None:
            end_offset = offset + 1

        msg = f"{type(e).__name__}: {e.msg}"
        return json.dumps([{
            "line": int(lineno),
            "column": int(offset),
            "endLine": int(end_lineno),
            "endColumn": int(end_offset),
            "message": str(msg)
        }])
    except Exception as e:
        return json.dumps([{
            "line": 1,
            "column": 1,
            "endLine": 1,
            "endColumn": 2,
            "message": f"Error: {str(e)}"
        }])

async def _trace_exec(code_str, filename="main.py", max_steps=500):
    steps = []
    stdout_buf = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_buf

    def safe_repr(val):
        try:
            r = repr(val)
            if len(r) > 100:
                r = r[:97] + "..."
            return r
        except:
            return "<non-repr>"

    def capture_vars(frame_dict):
        res = {}
        for k, v in frame_dict.items():
            if k.startswith("__") and k.endswith("__"):
                continue
            if isinstance(v, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType)):
                continue
            t_name = type(v).__name__
            val_str = safe_repr(v)
            val_category = "other"
            if isinstance(v, (int, float)):
                val_category = "number"
            elif isinstance(v, str):
                val_category = "string"
            elif isinstance(v, bool):
                val_category = "bool"

            res[k] = {
                "type": t_name,
                "value": val_str,
                "category": val_category
            }
        return res

    def tracer(frame, event, arg):
        if len(steps) >= max_steps:
            return None
        if frame.f_code.co_filename != filename:
            return tracer

        step_data = {
            "line": frame.f_lineno,
            "event": event,
            "func": frame.f_code.co_name,
            "locals": capture_vars(frame.f_locals),
            "globals": capture_vars(frame.f_globals),
            "stdout": stdout_buf.getvalue(),
            "exception": None,
            "return_value": None
        }

        if event == "exception" and arg:
            exc_type, exc_val, _ = arg
            step_data["exception"] = f"{exc_type.__name__}: {exc_val}"
        elif event == "return":
            step_data["return_value"] = safe_repr(arg)

        steps.append(step_data)
        return tracer

    # Collect prompts for all input() calls and prompt user interactively
    input_values_queue = []
    try:
        parsed_tree = ast.parse(code_str, filename)
        for node in ast.walk(parsed_tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "input":
                prompt_arg = ""
                if node.args and isinstance(node.args[0], ast.Constant):
                    prompt_arg = str(node.args[0].value)
                val = await js.requestInputFromMain(prompt_arg)
                if val is None:
                    raise EOFError("Ввод отменен пользователем")
                input_values_queue.append((prompt_arg, str(val)))
    except EOFError:
        sys.stdout = old_stdout
        return json.dumps([])
    except Exception:
        pass

    input_iter = iter(input_values_queue)

    def interactive_trace_input(prompt=""):
        prompt_str = str(prompt) if prompt is not None else ""
        if prompt_str:
            stdout_buf.write(prompt_str)
        try:
            p_arg, user_val = next(input_iter)
            stdout_buf.write(user_val + "\\n")
            return user_val
        except StopIteration:
            stdout_buf.write("\\n")
            return ""

    old_input = getattr(builtins, "input", None)
    builtins.input = interactive_trace_input

    try:
        compiled = compile(code_str, filename, "exec")
        sys.settrace(tracer)
        exec_globals = {"__name__": "__main__", "input": interactive_trace_input}
        exec(compiled, exec_globals)
    except Exception as e:
        steps.append({
            "line": getattr(e, "lineno", (steps[-1]["line"] if steps else 1)),
            "event": "exception",
            "func": "<module>",
            "locals": {},
            "globals": {},
            "stdout": stdout_buf.getvalue(),
            "exception": f"{type(e).__name__}: {e}",
            "return_value": None
        })
    finally:
        sys.settrace(None)
        if old_input is not None:
            builtins.input = old_input
        sys.stdout = old_stdout

    return json.dumps(steps)
`);

    postMessage({ type: 'status', status: 'ready', message: 'Среда Python готова' });
    isInitializing = false;
    return pyodide;
  } catch (err) {
    isInitializing = false;
    postMessage({ type: 'error', error: 'Ошибка инициализации Pyodide: ' + err.message });
    throw err;
  }
}

// Sync files to virtual FS
function syncFilesToFS(pyodideInstance, files) {
  try {
    try {
      pyodideInstance.FS.mkdir('/workspace');
    } catch (e) {
      // Directory may already exist
    }

    for (const [rawPath, content] of Object.entries(files)) {
      const cleanPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
      const fullPath = '/workspace' + cleanPath;

      // Ensure parent directories exist
      const parts = fullPath.split('/').filter(Boolean);
      let currentDir = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir += '/' + parts[i];
        try {
          pyodideInstance.FS.mkdir(currentDir);
        } catch (e) {
          // Ignore if exists
        }
      }

      pyodideInstance.FS.writeFile(fullPath, content, { encoding: 'utf8' });
    }
  } catch (err) {
    console.error('Error syncing files to FS:', err);
  }
}

self.onmessage = async (e) => {
  const { type, files, entryPoint } = e.data;

  if (type === 'init') {
    try {
      await initPyodide();
    } catch (err) {
      // Handled in initPyodide
    }
  } else if (type === 'format') {
    const { code, id } = e.data;
    try {
      if (!pyodide) {
        await initPyodide();
      }

      // Try loading micropip / autopep8 via pyodide package loader
      try {
        if (typeof pyodide.loadPackage === 'function') {
          await pyodide.loadPackage(['micropip']);
          await pyodide.runPythonAsync(`
import micropip
try:
    import autopep8
except ImportError:
    await micropip.install('autopep8')
`);
        }
      } catch (pkgErr) {
        console.warn('Could not install autopep8 via micropip, fallback to native formatter:', pkgErr);
      }

      pyodide.globals.set('_raw_format_code', code || '');
      const formattedCode = await pyodide.runPythonAsync(`
try:
    import autopep8
    _res = autopep8.fix_code(_raw_format_code)
except Exception:
    # Native pure-Python standard indent & spacing normalizer fallback
    import io, tokenize
    lines = _raw_format_code.splitlines()
    _res = "\\n".join(line.rstrip() for line in lines)
    if _raw_format_code.endswith("\\n") and not _res.endswith("\\n"):
        _res += "\\n"
_res
`);
      postMessage({ type: 'format-result', id, formatted: formattedCode, success: true });
    } catch (err) {
      postMessage({ type: 'format-result', id, error: err.message, success: false });
    }
  } else if (type === 'trace') {
    const { code, filename, id } = e.data;
    try {
      if (!pyodide) {
        await initPyodide();
      }
      pyodide.globals.set('_trace_code_input', code || '');
      pyodide.globals.set('_trace_filename_input', filename || 'main.py');
      const stepsJson = await pyodide.runPythonAsync(`_trace_exec(_trace_code_input, _trace_filename_input)`);
      const steps = JSON.parse(stepsJson || '[]');
      postMessage({ type: 'trace-result', id, steps, success: true });
    } catch (err) {
      postMessage({ type: 'trace-result', id, error: err.message, success: false });
    }
  } else if (type === 'lint') {
    const { code, filename, id } = e.data;
    try {
      if (!pyodide) {
        await initPyodide();
      }
      pyodide.globals.set('_lint_code_input', code || '');
      pyodide.globals.set('_lint_filename_input', filename || '<input>');
      const resJsonStr = await pyodide.runPythonAsync(`_check_python_syntax(_lint_code_input, _lint_filename_input)`);
      const markers = JSON.parse(resJsonStr || '[]');
      postMessage({ type: 'lint-result', id, markers, filename });
    } catch (err) {
      postMessage({ type: 'lint-result', id, markers: [], filename, error: err.message });
    }
  } else if (type === 'input-response') {
    const { id, value, isCancelled } = e.data;
    const resolver = inputResolvers.get(id);
    if (resolver) {
      inputResolvers.delete(id);
      if (isCancelled) {
        resolver(null);
      } else {
        resolver(typeof value === 'string' ? value : String(value || ''));
      }
    }
  } else if (type === 'run') {
    try {
      const py = await initPyodide();
      postMessage({ type: 'status', status: 'running', message: 'Выполнение кода...' });

      // Sync project files to Emscripten FS
      syncFilesToFS(py, files || {});

      // Change working directory to /workspace
      await py.runPythonAsync(`
import os
os.chdir('/workspace')
`);

      const entryCode = files[entryPoint || '/main.py'] || '';

      // Execute code with async input transformation support
      py.globals.set('_user_entry_code', entryCode);
      await py.runPythonAsync(`
import sys
import ast

_parsed_tree = ast.parse(_user_entry_code, "main.py")
_has_input = False

class _InputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.Await(
                value=ast.Call(
                    func=ast.Name(id="__custom_async_input__", ctx=ast.Load()),
                    args=node.args,
                    keywords=node.keywords
                )
            )
        return node

for node in ast.walk(_parsed_tree):
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "input":
        _has_input = True
        break

if _has_input:
    _transformer = _InputTransformer()
    _transformed_tree = _transformer.visit(_parsed_tree)
    ast.fix_missing_locations(_transformed_tree)

    _wrapper_func = ast.AsyncFunctionDef(
        name="__async_user_main__",
        args=ast.arguments(posonlyargs=[], args=[], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]),
        body=_transformed_tree.body,
        decorator_list=[]
    )
    _transformed_tree.body = [_wrapper_func]
    ast.fix_missing_locations(_transformed_tree)

    _compiled = compile(_transformed_tree, "main.py", "exec")
    _user_globals = {"__name__": "__main__", "__custom_async_input__": __custom_async_input__}
    exec(_compiled, _user_globals)
    await _user_globals["__async_user_main__"]()
else:
    _compiled = compile(_parsed_tree, "main.py", "exec")
    _user_globals = {"__name__": "__main__"}
    exec(_compiled, _user_globals)
`);

      postMessage({ type: 'finished', success: true });
      postMessage({ type: 'status', status: 'ready', message: 'Среда готова' });
    } catch (err) {
      postMessage({ type: 'stderr', text: `\nTraceback (most recent call last):\n${err.message}\n` });
      postMessage({ type: 'finished', success: false, error: err.message });
      postMessage({ type: 'status', status: 'ready', message: 'Среда готова (с ошибкой)' });
    }
  }
};
