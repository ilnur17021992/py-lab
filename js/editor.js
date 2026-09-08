// js/editor.js - Monaco / CodeMirror 6 VS Code Editor Integration
import { state } from './state.js';

export class EditorManager {
  constructor(containerEl, options = {}) {
    this.containerEl = containerEl;
    this.options = options;
    this.editorInstance = null;
    this.isUpdatingFromState = false;
    this.linterFn = null;
    this.lintDebounceTimer = null;
    this.debugDecorations = [];
    this.onRun = options.onRun || null;
    this.onFormat = options.onFormat || null;
  }

  async init() {
    // 1. First attempt Monaco Editor (Real VS Code Engine via CDN)
    try {
      if (typeof require === 'undefined') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js');
      }

      window.require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
        }
      });

      await new Promise((resolve) => {
        window.require(['vs/editor/editor.main'], () => {
          // Register Comprehensive Python Autocompletion Provider
          if (!monaco.languages.getLanguages().some(l => l.id === 'python') || !window._pythonCompletionRegistered) {
            window._pythonCompletionRegistered = true;
            monaco.languages.registerCompletionItemProvider('python', {
              provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: word.startColumn,
                  endColumn: word.endColumn
                };

                const keywords = [
                  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
                  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
                  'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
                  'return', 'try', 'while', 'with', 'yield', 'True', 'False', 'None'
                ];

                const builtins = [
                  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray', 'bytes',
                  'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
                  'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset',
                  'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int',
                  'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max',
                  'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print',
                  'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
                  'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
                ];

                const methods = [
                  'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'index', 'count', 'sort',
                  'reverse', 'copy', 'get', 'keys', 'values', 'items', 'update', 'split', 'join',
                  'replace', 'strip', 'lstrip', 'rstrip', 'lower', 'upper', 'title', 'capitalize',
                  'startswith', 'endswith', 'find', 'rfind', 'isdigit', 'isalpha', 'isalnum', 'add',
                  'discard', 'union', 'intersection', 'difference', 'symmetric_difference', 'read',
                  'write', 'readline', 'readlines', 'close', 'format', 'encode', 'decode'
                ];

                const suggestions = [];

                keywords.forEach((k) => {
                  suggestions.push({
                    label: k,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: k,
                    detail: 'keyword',
                    range: range
                  });
                });

                builtins.forEach((b) => {
                  suggestions.push({
                    label: b,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: b === 'print' ? 'print($0)' : `${b}($0)`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'built-in function',
                    range: range
                  });
                });

                methods.forEach((m) => {
                  suggestions.push({
                    label: m,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: `${m}($0)`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'method',
                    range: range
                  });
                });

                // Snippets
                suggestions.push(
                  {
                    label: 'def',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['def ${1:func_name}(${2:params}):', '\t${0:pass}'].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'function definition snippet',
                    range: range
                  },
                  {
                    label: 'class',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['class ${1:ClassName}:', '\tdef __init__(self${2:, params}):', '\t\t${0:pass}'].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'class definition snippet',
                    range: range
                  },
                  {
                    label: 'ifmain',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['if __name__ == "__main__":', '\t${0:main()}'].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'if __name__ == "__main__" boilerplate',
                    range: range
                  }
                );

                return { suggestions };
              }
            });
          }

          // Define Unified Python Lab Dark Theme
          monaco.editor.defineTheme('github-dark-custom', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
              { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
              { token: 'string', foreground: '38bdf8' },
              { token: 'number', foreground: 'fb923c' },
              { token: 'type', foreground: 'fbbf24' },
              { token: 'function', foreground: 'd2a8ff' }
            ],
            colors: {
              'editor.background': '#0c121c',
              'editor.foreground': '#f1f5f9',
              'editorLineNumber.foreground': '#2d3f59',
              'editorLineNumber.activeForeground': '#ff6b00',
              'editor.selectionBackground': '#ff6b0033',
              'editor.inactiveSelectionBackground': '#ff6b001a',
              'editorCursor.foreground': '#ff6b00',
              'editorGutter.background': '#0c121c',
              'editor.lineHighlightBackground': '#151f3044'
            }
          });

          this.containerEl.innerHTML = '';

          this.editorInstance = monaco.editor.create(this.containerEl, {
            value: state.getActiveContent(),
            language: 'python',
            theme: 'github-dark-custom',
            fontSize: 13.5,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: true, scale: 0.75 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            fixedOverflowWidgets: true,
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',
            suggestSelection: 'first'
          });

          // Register Hotkeys directly in Monaco
          this.editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (typeof this.onRun === 'function') {
              this.onRun();
            }
          });

          this.editorInstance.addAction({
            id: 'format-python',
            label: 'Форматировать код (PEP 8)',
            keybindings: [
              monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF
            ],
            run: () => {
              if (typeof this.onFormat === 'function') {
                this.onFormat();
              }
            }
          });

          this.editorInstance.onKeyDown((e) => {
            if (typeof this.keyDownHandler === 'function') {
              this.keyDownHandler(e);
            }
          });

          this.editorInstance.onDidChangeModelContent(() => {
            if (!this.isUpdatingFromState && state.activeFile) {
              const val = this.editorInstance.getValue();
              state.updateFileContent(state.activeFile, val);
              this.triggerLint();
            }
          });

          resolve();
        });
      });

      this.bindStateEvents();
      return;
    } catch (monacoErr) {
      console.warn('Monaco failed, attempting fallback CodeMirror:', monacoErr);
    }
  }

  setRunHandler(fn) {
    this.onRun = fn;
  }

  setFormatHandler(fn) {
    this.onFormat = fn;
  }

  setKeyDownHandler(fn) {
    this.keyDownHandler = fn;
  }

  setLinter(fn) {
    this.linterFn = fn;
    this.triggerLint();
  }

  triggerLint(delay = 350) {
    if (!this.editorInstance || !this.linterFn || typeof monaco === 'undefined') return;

    if (this.lintDebounceTimer) {
      clearTimeout(this.lintDebounceTimer);
    }

    this.lintDebounceTimer = setTimeout(async () => {
      const model = this.editorInstance.getModel();
      if (!model) return;

      const code = model.getValue();
      const filename = state.activeFile || 'main.py';

      try {
        const errorList = await this.linterFn(code, filename);
        if (this.editorInstance && this.editorInstance.getModel() === model) {
          const markers = (errorList || []).map((err) => ({
            startLineNumber: err.line || 1,
            startColumn: err.column || 1,
            endLineNumber: err.endLine || err.line || 1,
            endColumn: Math.max(err.endColumn || ((err.column || 1) + 1), (err.column || 1) + 1),
            message: err.message || 'SyntaxError',
            severity: monaco.MarkerSeverity.Error
          }));

          monaco.editor.setModelMarkers(model, 'python-syntax-linter', markers);
        }
      } catch (err) {
        console.error('Linting error:', err);
      }
    }, delay);
  }

  bindStateEvents() {
    state.addEventListener('active-file-changed', (e) => {
      this.setContent(e.detail.content || '');
      this.triggerLint(50);
    });

    state.addEventListener('project-loaded', () => {
      this.setContent(state.getActiveContent());
      this.triggerLint(50);
    });
  }

  setContent(newContent) {
    if (!this.editorInstance) return;
    const currentVal = this.editorInstance.getValue();
    if (currentVal === newContent) return;

    this.isUpdatingFromState = true;
    this.editorInstance.setValue(newContent);
    this.isUpdatingFromState = false;
  }

  getContent() {
    return this.editorInstance ? this.editorInstance.getValue() : '';
  }

  highlightDebugLine(lineNumber) {
    if (!this.editorInstance || typeof monaco === 'undefined') return;
    if (!lineNumber) {
      this.clearDebugLine();
      return;
    }

    this.debugDecorations = this.editorInstance.deltaDecorations(this.debugDecorations || [], [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-debug-active-line',
          glyphMarginClassName: 'monaco-debug-active-glyph'
        }
      }
    ]);
    this.editorInstance.revealLineInCenter(lineNumber);
  }

  clearDebugLine() {
    if (this.editorInstance && this.debugDecorations && this.debugDecorations.length > 0) {
      this.debugDecorations = this.editorInstance.deltaDecorations(this.debugDecorations, []);
      this.debugDecorations = [];
    }
  }

  focus() {
    if (this.editorInstance) {
      this.editorInstance.focus();
    }
  }

  revealLineAndColumn(lineNumber, column = 1) {
    if (!this.editorInstance || typeof monaco === 'undefined') return;
    this.editorInstance.setPosition({ lineNumber, column });
    this.editorInstance.revealLineInCenter(lineNumber);
    this.editorInstance.focus();
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
