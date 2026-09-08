// js/worker/workerBridge.js - Interface between Main Thread and Runner Web Worker
export class WorkerBridge extends EventTarget {
  constructor() {
    super();
    this.worker = null;
    this.isRunning = false;
    this.status = 'idle';
    this.lintRequestId = 0;
    this.lintCallbacks = new Map();
    this.formatRequestId = 0;
    this.formatCallbacks = new Map();
    this.traceRequestId = 0;
    this.traceCallbacks = new Map();
  }

  initWorker() {
    if (this.worker) return;

    // Cache-bust the worker URL to ensure fresh runner code is loaded
    const workerUrl = new URL('./runner.worker.js?v=' + Date.now(), import.meta.url);
    this.worker = new Worker(workerUrl);

    this.worker.onmessage = (e) => {
      const data = e.data;

      if (data.type === 'stdout') {
        this.dispatchEvent(new CustomEvent('stdout', { detail: data.text }));
      } else if (data.type === 'stderr') {
        this.dispatchEvent(new CustomEvent('stderr', { detail: data.text }));
      } else if (data.type === 'status') {
        this.status = data.status;
        this.dispatchEvent(new CustomEvent('status', { detail: { status: data.status, message: data.message } }));
      } else if (data.type === 'finished') {
        this.isRunning = false;
        this.dispatchEvent(new CustomEvent('finished', { detail: { success: data.success, error: data.error } }));
      } else if (data.type === 'error') {
        this.isRunning = false;
        this.dispatchEvent(new CustomEvent('stderr', { detail: data.error + '\n' }));
      } else if (data.type === 'lint-result') {
        const cb = this.lintCallbacks.get(data.id);
        if (cb) {
          this.lintCallbacks.delete(data.id);
          cb(data.markers || []);
        }
      } else if (data.type === 'format-result') {
        const cb = this.formatCallbacks.get(data.id);
        if (cb) {
          this.formatCallbacks.delete(data.id);
          cb(data);
        }
      } else if (data.type === 'trace-result') {
        const cb = this.traceCallbacks.get(data.id);
        if (cb) {
          this.traceCallbacks.delete(data.id);
          cb(data);
        }
      } else if (data.type === 'request-input') {
        this.dispatchEvent(new CustomEvent('request-input', { detail: { id: data.id, prompt: data.prompt } }));
      }
    };

    this.worker.onerror = (err) => {
      this.isRunning = false;
      this.dispatchEvent(new CustomEvent('stderr', { detail: 'Worker error: ' + err.message + '\n' }));
      this.dispatchEvent(new CustomEvent('finished', { detail: { success: false, error: err.message } }));
    };

    // Pre-initialize Pyodide
    this.worker.postMessage({ type: 'init' });
  }

  trace(code, filename = 'main.py') {
    if (!this.worker) {
      this.initWorker();
    }

    return new Promise((resolve) => {
      const id = ++this.traceRequestId;
      this.traceCallbacks.set(id, resolve);
      this.worker.postMessage({
        type: 'trace',
        id,
        code,
        filename
      });
    });
  }

  format(code) {
    if (!this.worker) {
      this.initWorker();
    }

    return new Promise((resolve) => {
      const id = ++this.formatRequestId;
      this.formatCallbacks.set(id, resolve);
      this.worker.postMessage({
        type: 'format',
        id,
        code
      });
    });
  }

  lint(code, filename = '<input>') {
    if (!this.worker) {
      this.initWorker();
    }

    return new Promise((resolve) => {
      const id = ++this.lintRequestId;
      this.lintCallbacks.set(id, resolve);
      this.worker.postMessage({
        type: 'lint',
        id,
        code,
        filename
      });
    });
  }

  run(projectFiles, entryPoint = '/main.py') {
    if (!this.worker) {
      this.initWorker();
    }

    this.isRunning = true;
    this.worker.postMessage({
      type: 'run',
      files: projectFiles,
      entryPoint: entryPoint
    });
  }

  sendInputResponse(id, value, isCancelled = false) {
    if (!this.worker) return;
    this.worker.postMessage({
      type: 'input-response',
      id,
      value: value || '',
      isCancelled: !!isCancelled
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isRunning = false;
      this.status = 'idle';
      this.lintCallbacks.clear();

      this.dispatchEvent(new CustomEvent('stdout', { detail: '\n[Процесс принудительно остановлен]\n' }));
      this.dispatchEvent(new CustomEvent('status', { detail: { status: 'ready', message: 'Готов к запуску' } }));
      this.dispatchEvent(new CustomEvent('finished', { detail: { success: false, terminated: true } }));

      // Spawn fresh worker instance for subsequent runs
      this.initWorker();
    }
  }
}
