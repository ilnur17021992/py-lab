// js/runner/e2bRunner.js - Cloud Sandbox Runner using E2B (Firecracker Linux MicroVM)

export const E2B_CONFIG = {
  workerKeyUrl: 'https://crimson-glade-8f31.rahmatullin-ilnur-17021992.workers.dev/api/e2b/key',
  defaultTimeoutMs: 300000 // 5 minutes
};

export class E2BRunner extends EventTarget {
  constructor() {
    super();
    this.sandbox = null;
    this.isRunning = false;
    this.status = 'idle';
    this.cachedApiKey = null;
    this.workerApiKey = null;
    this.sdkModule = null;
    this.currentExecution = null;
    this.activeWorkspaceDir = '/home/user/workspace';
  }

  /**
   * Dynamically loads the E2B Code Interpreter SDK from ESM CDN with fallback
   */
  async loadSDK() {
    if (this.sdkModule) return this.sdkModule;

    const cdns = [
      'https://esm.sh/@e2b/code-interpreter@1.0.4',
      'https://cdn.jsdelivr.net/npm/@e2b/code-interpreter@1.0.4/+esm',
      'https://esm.run/@e2b/code-interpreter'
    ];

    let lastError = null;
    for (const url of cdns) {
      try {
        const mod = await import(url);
        const CodeInterpreter = mod.CodeInterpreter || mod.default?.CodeInterpreter || mod.default;
        if (CodeInterpreter) {
          this.sdkModule = CodeInterpreter;
          return CodeInterpreter;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[E2BRunner] Не удалось загрузить SDK из ${url}:`, err.message);
      }
    }

    throw new Error(
      'Не удалось загрузить облачный SDK из CDN. Проверьте интернет-соединение или настройки блокировщика рекламы: ' +
      (lastError?.message || '')
    );
  }

  /**
   * Validates API Key and checks connection by creating and immediately closing a quick sandbox
   */
  async testConnection(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('API ключ не указан');
    }

    const CodeInterpreter = await this.loadSDK();
    const testSandbox = await CodeInterpreter.create({
      apiKey: apiKey.trim(),
      timeoutMs: 60000 // 1 min test
    });

    try {
      const result = await testSandbox.runCode('print("Connected Successfully")');
      const output = result.logs.stdout.join('') || result.text || 'OK';
      return { success: true, output };
    } finally {
      try {
        await testSandbox.kill();
      } catch (e) {
        // Ignore kill errors
      }
    }
  }

  /**
   * Fetches the E2B API key from Cloudflare Worker gateway
   */
  async fetchApiKey() {
    if (this.workerApiKey) return this.workerApiKey;

    const res = await fetch(E2B_CONFIG.workerKeyUrl);
    if (!res.ok) {
      let errMsg = `Ошибка получения ключа от сервера (HTTP ${res.status})`;
      try {
        const data = await res.json();
        if (data && data.error) errMsg = data.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data || !data.apiKey) {
      throw new Error('Сервер не вернул API ключ');
    }

    this.workerApiKey = data.apiKey;
    return this.workerApiKey;
  }

  /**
   * Resolves the API key to use:
   * 1. Explicitly passed key
   * 2. Cloudflare Worker gateway key
   */
  async resolveApiKey(passedKey = '') {
    const trimmed = (passedKey || '').trim();
    if (trimmed) return trimmed;

    return await this.fetchApiKey();
  }

  /**
   * Initializes or returns existing sandbox instance
   */
  async getOrCreateSandbox(apiKey) {
    const effectiveKey = await this.resolveApiKey(apiKey);
    const trimmedKey = (effectiveKey || '').trim();
    if (!trimmedKey) {
      throw new Error('Ключ доступа к облачной среде не настроен.');
    }

    const CodeInterpreter = await this.loadSDK();

    // If sandbox exists and key hasn't changed, test if it's still alive
    if (this.sandbox && this.cachedApiKey === trimmedKey) {
      try {
        // Quick ping to check if sandbox is alive
        await this.sandbox.commands.run('pwd', { timeoutMs: 3000 });
        return this.sandbox;
      } catch (err) {
        console.log('[E2BRunner] Предыдущая сессия песочницы истекла или недоступна, создаем новую...');
        try {
          await this.sandbox.kill();
        } catch (e) {}
        this.sandbox = null;
      }
    }

    this.dispatchEvent(new CustomEvent('status', {
      detail: { status: 'starting', message: 'Подготовка облачного окружения...' }
    }));
    this.dispatchEvent(new CustomEvent('stdout', {
      detail: '[Cloud] 🚀 Подготовка облачного окружения...\n'
    }));

    this.sandbox = await CodeInterpreter.create({
      apiKey: trimmedKey,
      timeoutMs: E2B_CONFIG.defaultTimeoutMs
    });
    this.cachedApiKey = trimmedKey;

    // Create workspace directory
    try {
      await this.sandbox.commands.run(`mkdir -p ${this.activeWorkspaceDir}`);
    } catch (e) {
      console.warn('[E2BRunner] Ошибка при mkdir workspace:', e);
    }

    this.dispatchEvent(new CustomEvent('stdout', {
      detail: '[Cloud] ✅ Облачное окружение готово.\n'
    }));

    return this.sandbox;
  }

  /**
   * Main code execution method
   * @param {Record<string, string>} files - map of project files (path -> content)
   * @param {string} activeFile - active file to run (e.g. '/main.py')
   * @param {Object} options - additional options (apiKey, timeoutMs)
   */
  async run(files, activeFile = '/main.py', options = {}) {
    if (this.isRunning) {
      this.dispatchEvent(new CustomEvent('stderr', { detail: 'Уже выполняется другой процесс.\n' }));
      return;
    }

    this.isRunning = true;
    this.dispatchEvent(new CustomEvent('status', {
      detail: { status: 'starting', message: 'Подготовка файлов и песочницы...' }
    }));

    try {
      const sandbox = await this.getOrCreateSandbox(options.apiKey);

      this.dispatchEvent(new CustomEvent('status', {
        detail: { status: 'uploading', message: 'Синхронизация файлов проекта...' }
      }));

      // 1. Upload/sync all project files to sandbox
      const filePaths = Object.keys(files || {});
      this.dispatchEvent(new CustomEvent('stdout', {
        detail: `[Cloud] 📂 Синхронизация файлов проекта (${filePaths.length} шт.)...\n`
      }));

      for (const filePath of filePaths) {
        const content = files[filePath] || '';
        // Ensure path is relative to workspace
        const cleanRelPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const targetPath = `${this.activeWorkspaceDir}/${cleanRelPath}`;

        // Ensure parent directory exists
        const lastSlash = targetPath.lastIndexOf('/');
        if (lastSlash !== -1) {
          const dir = targetPath.slice(0, lastSlash);
          await sandbox.commands.run(`mkdir -p "${dir}"`);
        }

        await sandbox.files.write(targetPath, content);
      }

      // 2. Check for requirements.txt and install if present
      if (files['/requirements.txt'] || files['requirements.txt']) {
        const reqContent = (files['/requirements.txt'] || files['requirements.txt'] || '').trim();
        if (reqContent.length > 0) {
          this.dispatchEvent(new CustomEvent('status', {
            detail: { status: 'installing', message: 'Установка пакетов...' }
          }));
          this.dispatchEvent(new CustomEvent('stdout', {
            detail: `[Cloud] ⚡ Обнаружен requirements.txt, установка пакетов...\n`
          }));

          // Ensure uv is present (installed in <1s if needed), then install dependencies via uv
          const installCmd = `cd ${this.activeWorkspaceDir} && (command -v uv >/dev/null 2>&1 || pip install --disable-pip-version-check -q uv) && uv pip install --system -r requirements.txt 2>&1`;

          const installRes = await sandbox.commands.run(
            installCmd,
            {
              onStdout: (chunk) => this.dispatchEvent(new CustomEvent('stdout', { detail: chunk })),
              // Send uv logs to stdout to avoid alarming red text in terminal
              onStderr: (chunk) => this.dispatchEvent(new CustomEvent('stdout', { detail: chunk }))
            }
          );

          if (installRes.exitCode !== 0) {
            this.dispatchEvent(new CustomEvent('stderr', {
              detail: `[Cloud] ⚠️ Предупреждение: установка зависимостей завершилась с кодом ${installRes.exitCode}\n`
            }));
          } else {
            this.dispatchEvent(new CustomEvent('stdout', {
              detail: `[Cloud] ✅ Зависимости успешно установлены.\n`
            }));
          }
        }
      }

      // 3. Execute active Python script
      const cleanEntryPoint = activeFile.startsWith('/') ? activeFile.slice(1) : activeFile;
      const targetScript = `${this.activeWorkspaceDir}/${cleanEntryPoint}`;

      this.dispatchEvent(new CustomEvent('status', {
        detail: { status: 'running', message: `Выполнение ${cleanEntryPoint}...` }
      }));
      this.dispatchEvent(new CustomEvent('stdout', {
        detail: `[Cloud] ▶️ python ${cleanEntryPoint}\n----------------------------------------\n`
      }));

      // Run with streaming stdout/stderr
      const execResult = await sandbox.commands.run(
        `cd ${this.activeWorkspaceDir} && python3 -u "${targetScript}"`,
        {
          onStdout: (data) => {
            this.dispatchEvent(new CustomEvent('stdout', { detail: data }));
          },
          onStderr: (data) => {
            this.dispatchEvent(new CustomEvent('stderr', { detail: data }));
          }
        }
      );

      this.dispatchEvent(new CustomEvent('stdout', {
        detail: `\n----------------------------------------\n[Cloud] Код завершен с кодом: ${execResult.exitCode}\n`
      }));

      this.isRunning = false;
      this.dispatchEvent(new CustomEvent('status', {
        detail: { status: 'ready', message: 'Выполнение завершено' }
      }));
      this.dispatchEvent(new CustomEvent('finished', {
        detail: {
          success: execResult.exitCode === 0,
          exitCode: execResult.exitCode,
          error: execResult.exitCode !== 0 ? `Exit code ${execResult.exitCode}` : null
        }
      }));

    } catch (err) {
      this.isRunning = false;
      const errMsg = err?.message || String(err);
      this.dispatchEvent(new CustomEvent('stderr', { detail: `\n[Ошибка в облаке] ${errMsg}\n` }));
      this.dispatchEvent(new CustomEvent('status', {
        detail: { status: 'error', message: 'Ошибка выполнения в облаке' }
      }));
      this.dispatchEvent(new CustomEvent('finished', {
        detail: { success: false, error: errMsg }
      }));
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Terminates active execution and closes sandbox
   */
  async terminate() {
    this.isRunning = false;
    if (this.sandbox) {
      try {
        this.dispatchEvent(new CustomEvent('stdout', {
          detail: '\n[Cloud] Принудительная остановка выполнения...\n'
        }));
        await this.sandbox.kill();
      } catch (err) {
        console.warn('[E2BRunner] Ошибка при завершении песочницы:', err);
      } finally {
        this.sandbox = null;
      }
    }

    this.dispatchEvent(new CustomEvent('status', {
      detail: { status: 'ready', message: 'Готов к запуску' }
    }));
    this.dispatchEvent(new CustomEvent('finished', {
      detail: { success: false, terminated: true }
    }));
  }

  sendInputResponse(id, value, isCancelled = false) {
    // E2B commands.run currently buffers via command execution
    // Interactive input can be piped if PTY is configured
    console.log('[E2BRunner] sendInputResponse received:', { id, value, isCancelled });
  }
}
