// js/runner/runnerManager.js - Unified Runner Facade for Pyodide (WASM) and E2B (Cloud Sandbox)
import { WorkerBridge } from '../worker/workerBridge.js';
import { E2BRunner } from './e2bRunner.js';

export class RunnerManager extends EventTarget {
  constructor() {
    super();
    this.pyodideRunner = new WorkerBridge();
    this.e2bRunner = new E2BRunner();

    // Default runtime from localStorage or fallback to 'pyodide'
    this.currentRuntime = localStorage.getItem('py_lab_runtime') || 'pyodide';

    this.bindRunnerEvents(this.pyodideRunner, 'pyodide');
    this.bindRunnerEvents(this.e2bRunner, 'e2b');
  }

  /**
   * Forwards events from individual runners to the manager if they come from the active runner
   */
  bindRunnerEvents(runner, runtimeType) {
    const forwardEvent = (eventName) => {
      runner.addEventListener(eventName, (e) => {
        if (this.currentRuntime === runtimeType) {
          this.dispatchEvent(new CustomEvent(eventName, { detail: e.detail }));
        }
      });
    };

    forwardEvent('stdout');
    forwardEvent('stderr');
    forwardEvent('status');
    forwardEvent('finished');
    forwardEvent('request-input');
  }

  /**
   * Switches execution environment ('pyodide' | 'e2b')
   */
  setRuntime(runtime) {
    if (runtime !== 'pyodide' && runtime !== 'e2b') {
      throw new Error(`Неизвестная среда выполнения: ${runtime}`);
    }

    if (this.isRunning) {
      this.terminate();
    }

    this.currentRuntime = runtime;
    localStorage.setItem('py_lab_runtime', runtime);

    this.dispatchEvent(new CustomEvent('runtime-changed', {
      detail: { runtime }
    }));
  }

  getRuntime() {
    return this.currentRuntime;
  }

  get isRunning() {
    return this.getActiveRunner().isRunning;
  }

  getActiveRunner() {
    return this.currentRuntime === 'e2b' ? this.e2bRunner : this.pyodideRunner;
  }

  /**
   * Runs project files using the currently active runtime
   */
  run(projectFiles, entryPoint = '/main.py', options = {}) {
    const runner = this.getActiveRunner();
    if (this.currentRuntime === 'e2b') {
      const apiKey = options.apiKey || localStorage.getItem('py_lab_e2b_api_key') || '';
      if (!apiKey.trim()) {
        this.dispatchEvent(new CustomEvent('e2b-config-required'));
        return;
      }
    }

    return runner.run(projectFiles, entryPoint, options);
  }

  /**
   * Terminates the active runner's execution
   */
  terminate() {
    return this.getActiveRunner().terminate();
  }

  /**
   * Sends input back to the active runner
   */
  sendInputResponse(id, value, isCancelled = false) {
    return this.getActiveRunner().sendInputResponse(id, value, isCancelled);
  }

  /**
   * Linting is handled locally via Pyodide worker for instant, offline feedback
   */
  lint(code, filename = '<input>') {
    return this.pyodideRunner.lint(code, filename);
  }

  /**
   * Code formatting handled via Pyodide / Black
   */
  format(code) {
    return this.pyodideRunner.format(code);
  }

  /**
   * Debug tracer handled via Pyodide
   */
  trace(code, filename = 'main.py') {
    return this.pyodideRunner.trace(code, filename);
  }

  /**
   * Test E2B API connection
   */
  async testE2BConnection(apiKey) {
    return this.e2bRunner.testConnection(apiKey);
  }
}

export const runnerManager = new RunnerManager();
