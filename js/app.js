// js/app.js - Modular Python Web IDE Application
import { db } from './db.js';
import { state } from './state.js';
import { EditorManager } from './editor.js';
import { TabManager } from './ui/tabManager.js';
import { ProjectExplorer } from './ui/projectExplorer.js';
import { SearchBar } from './ui/searchBar.js';
import { TerminalUI } from './ui/terminal.js';
import { WorkerBridge } from './worker/workerBridge.js';
import { zipExporter } from './utils/zipExporter.js';
import { projectModal } from './projectModal.js';

export class PythonWebIDEApp {
  constructor(options = {}) {
    this.options = Object.assign({
      mode: 'standalone', // 'standalone' | 'embedded'
      collapseSidebarOnInit: false,
      projectId: null,
    }, options);

    this.editor = null;
    this.tabManager = null;
    this.projectExplorer = null;
    this.terminal = null;
    this.workerBridge = null;
    this.toggleSidebar = null;
    this.setSidebarCollapsed = null;
    this.activeDebugger = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    // 1. Get project ID from options or URL query string
    let projectId = this.options.projectId;
    if (!projectId) {
      const urlParams = new URLSearchParams(window.location.search);
      projectId = urlParams.get('project');
    }

    if (!projectId) {
      // Look up existing projects or create a default starter project
      const projects = await db.getProjects();
      if (projects.length > 0) {
        projectId = projects[0].id;
      } else {
        const starter = await db.createProject('Первый проект');
        projectId = starter.id;
      }
      if (this.options.mode === 'standalone') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('project', projectId);
        window.history.replaceState({}, '', newUrl);
      }
    }

    try {
      await state.loadProject(projectId);
    } catch (err) {
      console.warn('Project not found, creating new one:', err);
      const newProj = await db.createProject('Мой проект');
      if (this.options.mode === 'standalone') {
        window.location.href = `ide.html?project=${encodeURIComponent(newProj.id)}`;
        return;
      } else {
        await state.loadProject(newProj.id);
      }
    }

    // 2. Initialize UI Components
    const editorRootEl = document.getElementById('codeMirrorRoot');
    const tabsBarEl = document.getElementById('editorTabsBar');
    const explorerEl = document.getElementById('fileExplorerContainer');
    const terminalBodyEl = document.getElementById('terminalBody');
    const terminalOutputEl = document.getElementById('terminalOutput');

    this.editor = new EditorManager(editorRootEl);
    await this.editor.init();

    this.tabManager = new TabManager(tabsBarEl);
    this.projectExplorer = new ProjectExplorer(explorerEl);
    this.searchBar = new SearchBar({ editor: this.editor, explorer: this.projectExplorer });
    this.terminal = new TerminalUI(terminalBodyEl, terminalOutputEl);
    this.workerBridge = new WorkerBridge();

    // Hook up real-time syntax linter to Monaco editor
    this.editor.setLinter((code, filename) => this.workerBridge.lint(code, filename));
    this.editor.setRunHandler(() => this.runProject());
    this.editor.setFormatHandler(() => this.formatActiveCode());
    this.editor.setKeyDownHandler((e) => {
      if (this.activeDebugger) {
        const key = e.browserEvent ? e.browserEvent.key : e.key;
        if (key === 'Escape') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          this.activeDebugger.exit();
        } else if (key === 'ArrowRight') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          this.activeDebugger.next();
        } else if (key === 'ArrowLeft') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          this.activeDebugger.prev();
        }
      }
    });

    // 3. Setup Events and Bridge connections
    this.bindWorkerEvents();
    this.bindHeaderControls();
    this.bindResizers();
    this.bindHotkeys();

    // 4. Update Header UI
    this.updateHeaderProjectInfo();

    // 5. Initial sidebar collapsed state for embedded/lesson mode
    if (this.options.collapseSidebarOnInit && typeof this.setSidebarCollapsed === 'function') {
      this.setSidebarCollapsed(true);
    }

    // Welcome message in terminal
    this.terminal.appendSystem(`Нажмите «Запустить» (Ctrl+Enter) для выполнения /main.py\n\n`);
    this.isInitialized = true;
  }

  updateHeaderProjectInfo() {
    const nameEl = document.getElementById('headerProjectName');
    const statusEl = document.getElementById('saveStatusIndicator');

    if (nameEl && state.currentProject) {
      nameEl.textContent = state.currentProject.name;

      nameEl.addEventListener('blur', () => {
        const newName = nameEl.textContent.trim();
        if (newName) {
          state.renameProject(newName);
        } else {
          nameEl.textContent = state.currentProject.name;
        }
      });

      nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameEl.blur();
        }
      });
    }

    state.addEventListener('save-status', (e) => {
      if (!statusEl) return;
      if (e.detail.status === 'saving') {
        statusEl.textContent = 'Сохранение...';
        statusEl.className = 'save-status-badge saving';
      } else {
        statusEl.textContent = 'Сохранено';
        statusEl.className = 'save-status-badge';
      }
    });

    state.addEventListener('project-renamed', (e) => {
      if (nameEl) nameEl.textContent = e.detail.name;
    });
  }

  bindWorkerEvents() {
    const runBtn = document.getElementById('runProjectBtn');
    const stopBtn = document.getElementById('stopProjectBtn');

    this.workerBridge.addEventListener('stdout', (e) => {
      this.terminal.appendStdout(e.detail);
    });

    this.workerBridge.addEventListener('stderr', (e) => {
      this.terminal.appendStderr(e.detail);
    });

    this.workerBridge.addEventListener('status', (e) => {
      const { status, message } = e.detail;
      this.terminal.updateStatus(status, message);
    });

    this.workerBridge.addEventListener('finished', (e) => {
      if (stopBtn) stopBtn.style.display = 'none';
      if (runBtn) {
        runBtn.style.display = 'inline-flex';
        runBtn.disabled = false;
      }

      if (e.detail.success) {
        this.terminal.appendLine('\n[Выполнение успешно завершено]\n', 'success');
      } else if (e.detail.terminated) {
        this.terminal.appendLine('\n[Выполнение прервано пользователем]\n', 'system');
      }
    });

    // Handle interactive Python input() modal dialog
    this.workerBridge.addEventListener('request-input', (e) => {
      const { id, prompt } = e.detail;
      const modal = document.getElementById('customInputModal');
      const form = document.getElementById('customInputForm');
      const inputField = document.getElementById('customInputField');
      const promptText = document.getElementById('inputModalPromptText');
      const cancelBtn = document.getElementById('customInputCancelBtn');

      if (!modal) {
        const val = window.prompt(prompt || 'Введите значение:');
        if (val === null) {
          this.workerBridge.sendInputResponse(id, '', true);
        } else {
          this.workerBridge.sendInputResponse(id, val, false);
        }
        return;
      }

      if (promptText) {
        promptText.textContent = prompt || 'Введите значение:';
      }
      if (inputField) {
        inputField.value = '';
      }

      modal.style.display = 'flex';
      setTimeout(() => {
        if (inputField) inputField.focus();
      }, 50);

      const cleanupAndClose = (cancelled, value = '') => {
        modal.style.display = 'none';
        form.removeEventListener('submit', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onEsc);
        this.workerBridge.sendInputResponse(id, value, cancelled);
      };

      const onSubmit = (evt) => {
        evt.preventDefault();
        const value = inputField ? inputField.value : '';
        cleanupAndClose(false, value);
      };

      const onCancel = () => {
        cleanupAndClose(true);
      };

      const onEsc = (evt) => {
        if (evt.key === 'Escape') {
          cleanupAndClose(true);
        }
      };

      form.addEventListener('submit', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onEsc);
    });
  }

  bindHeaderControls() {
    const backBtn = document.getElementById('navBackBtn') || document.querySelector('.nav-back-link');
    const runBtn = document.getElementById('runProjectBtn');
    const stopBtn = document.getElementById('stopProjectBtn');
    const formatBtn = document.getElementById('formatProjectBtn');
    const stepBtn = document.getElementById('stepProjectBtn');
    const openProjectsBtn = document.getElementById('openProjectModalBtn');
    const exportBtn = document.getElementById('exportZipBtn');
    const importInput = document.getElementById('importFileInput');

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const returnUrl = sessionStorage.getItem('learn_py_return_url');
        if (returnUrl) {
          sessionStorage.removeItem('learn_py_return_url');
          window.location.href = returnUrl;
        } else if (document.referrer && document.referrer.startsWith(window.location.origin) && !document.referrer.includes('ide.html')) {
          window.location.href = document.referrer;
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', () => this.runProject());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.workerBridge.terminate();
      });
    }

    if (formatBtn) {
      formatBtn.addEventListener('click', () => this.formatActiveCode());
    }

    if (stepBtn) {
      stepBtn.addEventListener('click', () => this.stepActiveCode());
    }

    if (openProjectsBtn) {
      openProjectsBtn.addEventListener('click', () => {
        projectModal.open();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        zipExporter.exportCurrentProject();
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          zipExporter.importFile(file);
        }
      });
    }
  }

  // Switch or open a topic-specific project
  async openTopicProject(topicId, topicName, initialCode = null) {
    if (!topicId) return;
    await state.forceSave();
    const project = await db.getOrCreateTopicProject(topicId, topicName, initialCode);
    if (!state.currentProject || state.currentProject.id !== project.id) {
      await state.loadProject(project.id);
    }
    this.updateHeaderProjectInfo();
    return project;
  }

  // Public API to set code into the active or specified file
  setCode(code, filename = '/main.py') {
    if (!state.currentProject) return;

    const normalizedPath = filename.startsWith('/') ? filename : `/${filename}`;
    if (!state.currentProject.files[normalizedPath]) {
      state.createFile(normalizedPath, code);
    } else {
      state.updateFileContent(normalizedPath, code);
    }
    state.openTab(normalizedPath);
    if (this.editor) {
      this.editor.setContent(code);
    }
  }

  // Public API to run code
  async runCurrentCode() {
    await this.runProject();
  }

  async runProject() {
    const runBtn = document.getElementById('runProjectBtn');
    const stopBtn = document.getElementById('stopProjectBtn');

    // Force save all files before execution
    await state.forceSave();

    if (runBtn) runBtn.style.display = 'none';
    if (stopBtn) {
      stopBtn.style.display = 'inline-flex';
      stopBtn.disabled = false;
    }

    this.terminal.clear();
    const activeFile = state.activeFile || '/main.py';
    this.terminal.appendSystem(`[Запуск ${activeFile}...]\n\n`);

    this.workerBridge.run(state.currentProject.files, activeFile);
  }

  async formatActiveCode() {
    if (!this.editor) return;
    const code = this.editor.getContent();
    if (!code || !code.trim()) return;

    const formatBtn = document.getElementById('formatProjectBtn');
    const origHtml = formatBtn ? formatBtn.innerHTML : '';
    if (formatBtn) {
      formatBtn.innerHTML = '<span>⏳</span><span>Форматирование...</span>';
      formatBtn.disabled = true;
    }

    try {
      const result = await this.workerBridge.format(code);
      if (result && result.success && result.formatted) {
        this.editor.setContent(result.formatted);
        if (state.activeFile) {
          state.updateFileContent(state.activeFile, result.formatted);
        }
      } else if (result && result.error) {
        this.terminal.appendStderr(`Ошибка форматирования: ${result.error}\n`);
      }
    } catch (err) {
      console.error('Format error:', err);
    } finally {
      if (formatBtn) {
        formatBtn.innerHTML = origHtml;
        formatBtn.disabled = false;
      }
    }
  }

  async stepActiveCode() {
    if (!this.editor) return;
    const code = this.editor.getContent();
    if (!code || !code.trim()) return;

    const stepBtn = document.getElementById('stepProjectBtn');
    const origHtml = stepBtn ? stepBtn.innerHTML : '';
    if (stepBtn) {
      stepBtn.innerHTML = '<span>⏳</span><span>Анализ шагов...</span>';
      stepBtn.disabled = true;
    }

    try {
      const res = await this.workerBridge.trace(code, state.activeFile || 'main.py');
      if (res && res.success && Array.isArray(res.steps) && res.steps.length > 0) {
        this.renderStepDebugger(res.steps);
      } else {
        this.terminal.clear();
        this.terminal.appendStderr(`Не удалось выполнить пошаговую трассировку: ${res?.error || 'нет шагов'}\n`);
      }
    } catch (err) {
      console.error('Debug trace error:', err);
    } finally {
      if (stepBtn) {
        stepBtn.innerHTML = origHtml;
        stepBtn.disabled = false;
      }
    }
  }

  renderStepDebugger(steps) {
    let currentIdx = 0;
    const totalSteps = steps.length;

    const termBody = document.getElementById('terminalBody');
    const debugViewBody = document.getElementById('debugViewBody');
    const debugControls = document.getElementById('ideDebugControls');
    const workerStatusBadge = document.getElementById('workerStatusBadge');
    const clearTerminalBtn = document.getElementById('clearTerminalBtn');
    const termTabTitle = document.getElementById('termTabTitle');
    const termTabIcon = document.getElementById('termTabIcon');

    const debugEventText = document.getElementById('debugEventText');
    const debugVarsContainer = document.getElementById('debugVarsContainer');
    const debugOutputText = document.getElementById('debugOutputText');
    const debugStepInfo = document.getElementById('debugStepInfo');
    const debugFirstBtn = document.getElementById('debugFirstBtn');
    const debugPrevBtn = document.getElementById('debugPrevBtn');
    const debugNextBtn = document.getElementById('debugNextBtn');
    const debugLastBtn = document.getElementById('debugLastBtn');
    const debugExitBtn = document.getElementById('debugExitBtn');

    // Switch to Debug Mode UI
    if (termBody) termBody.style.display = 'none';
    if (debugViewBody) debugViewBody.style.display = 'flex';
    if (debugControls) debugControls.style.display = 'flex';
    if (workerStatusBadge) workerStatusBadge.style.display = 'none';
    if (clearTerminalBtn) clearTerminalBtn.style.display = 'none';
    if (termTabTitle) termTabTitle.textContent = 'Дебаггер (Пошаговое выполнение)';
    if (termTabIcon) termTabIcon.textContent = '🪲';

    const exitDebugMode = () => {
      this.activeDebugger = null;
      this.editor.clearDebugLine();
      if (termBody) termBody.style.display = 'block';
      if (debugViewBody) debugViewBody.style.display = 'none';
      if (debugControls) debugControls.style.display = 'none';
      if (workerStatusBadge) workerStatusBadge.style.display = 'flex';
      if (clearTerminalBtn) clearTerminalBtn.style.display = 'flex';
      if (termTabTitle) termTabTitle.textContent = 'Терминал';
      if (termTabIcon) termTabIcon.textContent = '🖥️';
      this.terminal.clear();
      this.terminal.appendSystem('[Отладка завершена]\n');
    };

    this.activeDebugger = {
      next: () => {
        if (currentIdx < totalSteps - 1) {
          currentIdx++;
          renderCurrentStep();
        }
      },
      prev: () => {
        if (currentIdx > 0) {
          currentIdx--;
          renderCurrentStep();
        }
      },
      exit: () => {
        exitDebugMode();
      }
    };

    const renderCurrentStep = () => {
      const step = steps[currentIdx];

      // Highlight active executing line in Monaco
      if (step.line) {
        this.editor.highlightDebugLine(step.line);
      }

      // Update Header Controls
      if (debugStepInfo) {
        debugStepInfo.textContent = `Шаг ${currentIdx + 1} из ${totalSteps}`;
      }
      if (debugFirstBtn) debugFirstBtn.disabled = currentIdx === 0;
      if (debugPrevBtn) debugPrevBtn.disabled = currentIdx === 0;
      if (debugNextBtn) debugNextBtn.disabled = currentIdx === totalSteps - 1;
      if (debugLastBtn) debugLastBtn.disabled = currentIdx === totalSteps - 1;

      // Update Event Banner and Scope Badge
      if (debugEventText) {
        debugEventText.textContent = `Строка ${step.line || 1} (${step.func === '<module>' ? 'Основной код' : `Функция ${step.func}`})`;
      }

      const debugScopeBadge = document.getElementById('debugScopeBadge');
      const isInsideFunc = step.func && step.func !== '<module>';
      if (debugScopeBadge) {
        if (isInsideFunc) {
          debugScopeBadge.textContent = `Локальная область (${step.func})`;
          debugScopeBadge.className = 'debug-scope-badge local-scope';
        } else {
          debugScopeBadge.textContent = 'Глобальная область';
          debugScopeBadge.className = 'debug-scope-badge global-scope';
        }
      }

      // Render Variables Inspector with Local vs Global separation
      if (debugVarsContainer) {
        debugVarsContainer.innerHTML = '';
        const globals = step.globals || {};
        const locals = step.locals || {};

        const renderVarList = (varsObj, title, isLocal) => {
          const keys = Object.keys(varsObj);
          if (keys.length === 0) return;

          const groupHeader = document.createElement('div');
          groupHeader.className = `debug-vars-group-header ${isLocal ? 'local' : 'global'}`;
          groupHeader.textContent = title;
          debugVarsContainer.appendChild(groupHeader);

          keys.forEach(varName => {
            const varInfo = varsObj[varName];
            const row = document.createElement('div');
            row.className = `debug-var-row ${isLocal ? 'local-var' : 'global-var'}`;
            row.innerHTML = `
              <div class="debug-var-name-type">
                <span class="debug-var-name">${varName}</span>
                <span class="debug-var-type">: ${varInfo.type || 'var'}</span>
              </div>
              <span class="debug-var-value" title="${varInfo.value}">${varInfo.value}</span>
            `;
            debugVarsContainer.appendChild(row);
          });
        };

        if (isInsideFunc) {
          renderVarList(locals, '🔷 Локальные переменные', true);
          renderVarList(globals, '🌐 Глобальные переменные', false);
        } else {
          renderVarList(globals, '🌐 Глобальные переменные', false);
        }

        if (debugVarsContainer.children.length === 0) {
          debugVarsContainer.innerHTML = '<div class="debug-empty-hint">(Переменные пока не созданы)</div>';
        }
      }

      // Render stdout up to this step
      if (debugOutputText) {
        debugOutputText.textContent = step.stdout || '';
        if (step.exception) {
          debugOutputText.textContent += `\n⚠️ Исключение: ${step.exception}`;
        }
      }
    };

    // Bind Header Debug Controls
    debugFirstBtn.onclick = () => {
      currentIdx = 0;
      renderCurrentStep();
    };
    debugPrevBtn.onclick = () => {
      if (currentIdx > 0) {
        currentIdx--;
        renderCurrentStep();
      }
    };
    debugNextBtn.onclick = () => {
      if (currentIdx < totalSteps - 1) {
        currentIdx++;
        renderCurrentStep();
      }
    };
    debugLastBtn.onclick = () => {
      currentIdx = totalSteps - 1;
      renderCurrentStep();
    };
    debugExitBtn.onclick = () => {
      exitDebugMode();
    };

    renderCurrentStep();
  }

  bindResizers() {
    const STORAGE_KEY_SIDEBAR_WIDTH = 'learn_py_ide_sidebar_width';
    const STORAGE_KEY_SIDEBAR_COLLAPSED = 'learn_py_ide_sidebar_collapsed';
    const STORAGE_KEY_TERMINAL_HEIGHT = 'learn_py_ide_terminal_height';

    // 1. Sidebar Resizer & Collapse/Expand Logic
    const sidebarResizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('ideSidebar');
    const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
    const stripToggleExplorerBtn = document.getElementById('stripToggleExplorerBtn');
    const expandSidebarBtn = document.getElementById('expandSidebarBtn');
    const toggleSidebarNavBtn = document.getElementById('toggleSidebarNavBtn');

    if (sidebarResizer && sidebar) {
      let lastExpandedWidth = 240;

      // Restore saved sidebar width
      try {
        const savedWidth = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
        if (savedWidth) {
          const widthVal = Math.max(160, Math.min(parseFloat(savedWidth), window.innerWidth * 0.6));
          sidebar.style.width = `${widthVal}px`;
          lastExpandedWidth = widthVal;
        }
      } catch (e) {
        console.error('Error loading saved sidebar width:', e);
      }

      const setSidebarCollapsed = (collapsed) => {
        if (collapsed) {
          const curWidth = sidebar.getBoundingClientRect().width;
          if (curWidth > 80) {
            lastExpandedWidth = curWidth;
          }
          sidebar.classList.add('collapsed');
          sidebarResizer.classList.add('collapsed');
          if (stripToggleExplorerBtn) {
            stripToggleExplorerBtn.classList.remove('active');
            stripToggleExplorerBtn.setAttribute('title', 'Открыть проводник (Ctrl+B)');
          }
          if (expandSidebarBtn) expandSidebarBtn.style.display = 'none';
          if (toggleSidebarNavBtn) {
            toggleSidebarNavBtn.classList.remove('active');
            toggleSidebarNavBtn.setAttribute('title', 'Показать проводник (Ctrl+B)');
          }
          if (this.options.mode === 'standalone') {
            try {
              localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, 'true');
            } catch (e) {}
          }
        } else {
          sidebar.classList.remove('collapsed');
          sidebarResizer.classList.remove('collapsed');
          const targetWidth = Math.max(160, Math.min(lastExpandedWidth || 240, window.innerWidth * 0.6));
          sidebar.style.width = `${targetWidth}px`;
          if (stripToggleExplorerBtn) {
            stripToggleExplorerBtn.classList.add('active');
            stripToggleExplorerBtn.setAttribute('title', 'Скрыть проводник (Ctrl+B)');
          }
          if (expandSidebarBtn) expandSidebarBtn.style.display = 'none';
          if (toggleSidebarNavBtn) {
            toggleSidebarNavBtn.classList.add('active');
            toggleSidebarNavBtn.setAttribute('title', 'Скрыть проводник (Ctrl+B)');
          }
          if (this.options.mode === 'standalone') {
            try {
              localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, 'false');
              localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(targetWidth));
            } catch (e) {}
          }
        }
        if (this.editor && this.editor.editorInstance) {
          this.editor.editorInstance.layout();
        }
      };

      const toggleSidebar = () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        setSidebarCollapsed(!isCollapsed);
      };

      this.toggleSidebar = toggleSidebar;
      this.setSidebarCollapsed = setSidebarCollapsed;

      // Restore collapsed state (in standalone mode or respect default)
      if (this.options.mode === 'standalone') {
        try {
          const savedCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED);
          if (savedCollapsed === 'true') {
            setSidebarCollapsed(true);
          } else {
            if (stripToggleExplorerBtn) stripToggleExplorerBtn.classList.add('active');
            if (toggleSidebarNavBtn) toggleSidebarNavBtn.classList.add('active');
          }
        } catch (e) {}
      } else if (this.options.collapseSidebarOnInit) {
        setSidebarCollapsed(true);
      }

      if (collapseSidebarBtn) {
        collapseSidebarBtn.addEventListener('click', () => setSidebarCollapsed(true));
      }
      if (stripToggleExplorerBtn) {
        stripToggleExplorerBtn.addEventListener('click', () => toggleSidebar());
      }
      if (expandSidebarBtn) {
        expandSidebarBtn.addEventListener('click', () => setSidebarCollapsed(false));
      }
      if (toggleSidebarNavBtn) {
        toggleSidebarNavBtn.addEventListener('click', () => toggleSidebar());
      }
      sidebarResizer.addEventListener('dblclick', () => toggleSidebar());

      let isResizingX = false;
      let startX = 0;
      let startWidth = 240;

      sidebarResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingX = true;
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        sidebarResizer.classList.add('resizing');
        document.body.classList.add('resizing-active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizingX) return;
        const deltaX = e.clientX - startX;
        const ideContainer = sidebar.closest('.ide-workspace') || document.body;
        const maxAllowed = Math.min(600, ideContainer.clientWidth * 0.6);
        const newWidth = startWidth + deltaX;

        if (newWidth < 75) {
          // Snap collapse if dragged all the way to the left
          setSidebarCollapsed(true);
          isResizingX = false;
          sidebarResizer.classList.remove('resizing');
          document.body.classList.remove('resizing-active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          return;
        }

        const clampedWidth = Math.max(160, Math.min(newWidth, maxAllowed));
        sidebar.style.width = `${clampedWidth}px`;
        lastExpandedWidth = clampedWidth;
        if (this.editor && this.editor.editorInstance) {
          this.editor.editorInstance.layout();
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizingX) {
          isResizingX = false;
          sidebarResizer.classList.remove('resizing');
          document.body.classList.remove('resizing-active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          try {
            localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(sidebar.getBoundingClientRect().width));
          } catch (e) {}
          if (this.editor && this.editor.editorInstance) {
            this.editor.editorInstance.layout();
          }
        }
      });
    }

    // 2. Terminal Resizer (Full-Width Header Drag Handle & Click to Toggle)
    const terminalHeader = document.getElementById('terminalHeader') || document.getElementById('terminalResizer');
    const terminalSection = document.getElementById('ideTerminalSection');

    if (terminalHeader && terminalSection) {
      const DEFAULT_HEIGHT = 220;
      const getCollapsedHeight = () => terminalHeader.offsetHeight || 34;
      let lastExpandedHeight = DEFAULT_HEIGHT;

      // Restore saved terminal height
      try {
        const savedHeight = localStorage.getItem(STORAGE_KEY_TERMINAL_HEIGHT);
        if (savedHeight) {
          const heightVal = parseFloat(savedHeight);
          const collapsedH = getCollapsedHeight();
          if (heightVal > collapsedH + 15) {
            const clampedH = Math.min(heightVal, window.innerHeight * 0.75);
            terminalSection.style.height = `${clampedH}px`;
            lastExpandedHeight = clampedH;
            terminalSection.classList.remove('collapsed');
          } else {
            terminalSection.classList.add('collapsed');
            terminalSection.style.height = '';
          }
        }
      } catch (e) {
        console.error('Error loading saved terminal height:', e);
      }

      let isResizingY = false;
      let startY = 0;
      let startHeight = 0;
      let didDrag = false;

      const onDragStart = (clientY) => {
        isResizingY = true;
        didDrag = false;
        startY = clientY;
        startHeight = terminalSection.getBoundingClientRect().height;
        terminalSection.classList.add('resizing');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
      };

      const onDragMove = (clientY) => {
        if (!isResizingY) return;
        const deltaY = startY - clientY;
        if (Math.abs(deltaY) > 3) {
          didDrag = true;
        }

        const collapsedH = getCollapsedHeight();
        const maxHeight = Math.max(collapsedH, window.innerHeight * 0.85);
        let newHeight = startHeight + deltaY;

        if (newHeight < collapsedH + 20) {
          terminalSection.classList.add('collapsed');
          terminalSection.style.height = '';
        } else {
          newHeight = Math.min(newHeight, maxHeight);
          lastExpandedHeight = newHeight;
          terminalSection.classList.remove('collapsed');
          terminalSection.style.height = `${newHeight}px`;
        }

        if (this.editor && this.editor.editorInstance) {
          this.editor.editorInstance.layout();
        }
      };

      const onDragEnd = () => {
        if (!isResizingY) return;
        const wasDragging = didDrag;
        isResizingY = false;
        terminalSection.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        const collapsedH = getCollapsedHeight();

        if (!wasDragging) {
          // Toggle collapsed / expanded state on click
          const isCollapsed = terminalSection.classList.contains('collapsed') ||
            terminalSection.getBoundingClientRect().height <= collapsedH + 5;
          if (isCollapsed) {
            const targetHeight = Math.max(140, lastExpandedHeight || DEFAULT_HEIGHT);
            terminalSection.classList.remove('collapsed');
            terminalSection.style.height = `${targetHeight}px`;
            try {
              localStorage.setItem(STORAGE_KEY_TERMINAL_HEIGHT, String(targetHeight));
            } catch (err) {}
          } else {
            lastExpandedHeight = terminalSection.getBoundingClientRect().height;
            terminalSection.classList.add('collapsed');
            terminalSection.style.height = '';
            try {
              localStorage.setItem(STORAGE_KEY_TERMINAL_HEIGHT, String(collapsedH));
            } catch (err) {}
          }
        } else {
          const isCollapsed = terminalSection.classList.contains('collapsed');
          if (isCollapsed) {
            terminalSection.style.height = '';
            try {
              localStorage.setItem(STORAGE_KEY_TERMINAL_HEIGHT, String(collapsedH));
            } catch (e) {}
          } else {
            const currentHeight = terminalSection.getBoundingClientRect().height;
            try {
              localStorage.setItem(STORAGE_KEY_TERMINAL_HEIGHT, String(currentHeight));
            } catch (e) {}
          }
        }

        if (this.editor && this.editor.editorInstance) {
          this.editor.editorInstance.layout();
        }
      };

      terminalHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
        onDragStart(e.clientY);
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (isResizingY) {
          onDragMove(e.clientY);
        }
      });

      document.addEventListener('mouseup', onDragEnd);
    }
  }

  bindHotkeys() {
    document.addEventListener('keydown', (e) => {
      // Step Debugger controls: Escape (Exit), ArrowRight (Next step), ArrowLeft (Prev step)
      if (this.activeDebugger) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.activeDebugger.exit();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.activeDebugger.next();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.activeDebugger.prev();
          return;
        }
      }

      // Toggle Sidebar: Ctrl+B / Cmd+B
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        if (typeof this.toggleSidebar === 'function') {
          this.toggleSidebar();
        }
      }

      // Run: Ctrl+Enter / Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runProject();
      }

      // Format: Shift+Alt+F
      if (e.shiftKey && e.altKey && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А')) {
        e.preventDefault();
        this.formatActiveCode();
      }

      // Step Debugger: F10
      if (e.code === 'F10' || e.key === 'F10') {
        e.preventDefault();
        this.stepActiveCode();
      }

      // Save: Ctrl+S
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        state.forceSave();
      }

      // Close Tab: Ctrl+W
      if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
        if (state.activeFile) {
          e.preventDefault();
          state.closeTab(state.activeFile);
        }
      }
    });
  }
}

// Auto-initialize if running directly on ide.html
if (window.location.pathname.endsWith('ide.html') || window.location.pathname.endsWith('ide')) {
  const ideApp = new PythonWebIDEApp({ mode: 'standalone' });
  document.addEventListener('DOMContentLoaded', () => {
    ideApp.init();
  });
}
