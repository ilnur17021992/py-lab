// Application State
import { WorkerBridge } from "./js/worker/workerBridge.js";
import { PythonWebIDEApp } from "./js/app.js";
import { courseSdk } from "./js/core/courseSdk.js";
import { toast } from "./js/ui/components/toast.js";

const workerBridge = new WorkerBridge();
let TOPICS = [];
let currentTopic = null;
let currentExampleCode = "";
let embeddedIDE = null;

// LocalStorage Keys
const STORAGE_KEY_COMPLETED = "learn_py_completed_topics";
const STORAGE_KEY_TOPIC_CODE_PREFIX = "learn_py_code_topic_";
const STORAGE_KEY_LAST_TOPIC = "learn_py_last_topic";

// Search Placeholders
export const SEARCH_PLACEHOLDERS = {
  CATALOG: "Поиск по темам, методам и коду...",
  PALETTE: "Поиск по методам (.append, sort), функциям, коду...",
  IDE: "Поиск по файлам, папкам и коду..."
};

// DOM Elements
const catalogView = document.getElementById("catalogView");
const workspaceView = document.getElementById("workspaceView");
const brandHomeLink = document.getElementById("brandHomeLink");
const searchInput = document.getElementById("searchInput");
const topicsGrid = document.getElementById("topicsGrid");
const catalogTagFilters = document.getElementById("catalogTagFilters");
const catalogProgressFill = document.getElementById("catalogProgressFill");
const catalogProgressText = document.getElementById("catalogProgressText");
const sidebarTopicsList = document.getElementById("sidebarTopicsList");
const topicCategoryText = document.getElementById("topicCategoryText");
const topicTitleText = document.getElementById("topicTitleText");
const topicCompleteBtn = document.getElementById("topicCompleteBtn");
const topicCompleteIcon = document.getElementById("topicCompleteIcon");
const topicCompleteText = document.getElementById("topicCompleteText");
const ideSaveIndicator = document.getElementById("ideSaveIndicator");
const theoryBlock = document.getElementById("theoryBlock");
const snippetsList = document.getElementById("snippetsList");
const runIdeBtn = document.getElementById("runIdeBtn");
const stopIdeBtn = document.getElementById("stopIdeBtn");
const stepDebugBtn = document.getElementById("stepDebugBtn");
const resetCodeBtn = document.getElementById("resetCodeBtn");
const formatCodeBtn = document.getElementById("formatCodeBtn");
const clearTermBtn = document.getElementById("clearTermBtn");
const terminalBody = document.getElementById("terminalBody");
const terminalTitleText = document.getElementById("terminalTitleText");
const globalSearchBtn = document.getElementById("globalSearchBtn");
const searchPaletteModal = document.getElementById("searchPaletteModal");
const paletteSearchInput = document.getElementById("paletteSearchInput");
const paletteResultsList = document.getElementById("paletteResultsList");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const hotkeysModalBtn = document.getElementById("hotkeysModalBtn");
const hotkeysModal = document.getElementById("hotkeysModal");
const closeHotkeysModalBtn = document.getElementById("closeHotkeysModalBtn");

// Custom Input Modal Elements
const customInputModal = document.getElementById("customInputModal");
const inputModalPromptText = document.getElementById("inputModalPromptText");
const customInputForm = document.getElementById("customInputForm");
const customInputField = document.getElementById("customInputField");
const customInputCancelBtn = document.getElementById("customInputCancelBtn");

let activeInputResolver = null;
let activeInputRejecter = null;

window.showCustomInputModal = function (promptText) {
  return new Promise((resolve, reject) => {
    if (!customInputModal) {
      const val = window.prompt(promptText || "Введите значение:");
      if (val === null) reject(new Error("Ввод отменен пользователем"));
      else resolve(val);
      return;
    }

    activeInputResolver = resolve;
    activeInputRejecter = reject;

    if (inputModalPromptText) {
      inputModalPromptText.textContent = promptText || "Введите значение:";
    }
    if (customInputField) {
      customInputField.value = "";
    }
    customInputModal.style.display = "flex";
    setTimeout(() => {
      if (customInputField) customInputField.focus();
    }, 50);
  });
};

function closeCustomInputModal(isCancelled = false, value = "") {
  if (customInputModal) {
    customInputModal.style.display = "none";
  }
  if (isCancelled) {
    if (activeInputRejecter) activeInputRejecter(new Error("Ввод отменен пользователем"));
  } else {
    if (activeInputResolver) activeInputResolver(value);
  }
  activeInputResolver = null;
  activeInputRejecter = null;
}

let activePaletteIndex = 0;
let paletteResults = [];

// Course SDK / Storage Integration
function getCompletedTopics() {
  return courseSdk.getCompletedTopicIds();
}

function setCompletedTopics(list) {
  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(list));
  } catch (e) {
    console.error("Error saving completed topics:", e);
  }
}

function isTopicCompleted(topicId) {
  return courseSdk.isTopicCompleted(topicId);
}

function toggleTopicCompleted(topicId) {
  const isCompleted = courseSdk.toggleTopicCompleted(topicId);
  updateProgressUI();
  if (isCompleted) {
    toast.success("Тема отмечена как пройденная");
  } else {
    toast.info("Тема снята с отмеченных");
  }
  return isCompleted;
}

function getSavedTopicCode(topicId) {
  return courseSdk.getSavedTopicCode(topicId);
}

function saveTopicCode(topicId, code) {
  if (topicId) {
    courseSdk.saveTopicCode(topicId, code);
    showSaveStatus();
  }
}

function removeSavedTopicCode(topicId) {
  courseSdk.clearSavedTopicCode(topicId);
}

function showSaveStatus() {
  if (!ideSaveIndicator) return;
  ideSaveIndicator.classList.remove("saving");
  ideSaveIndicator.classList.add("saved");
  ideSaveIndicator.innerHTML = `<span>✓</span> <span>Сохранено</span>`;
}

// SVG Checkmark icon for crisp vector rendering
const CHECK_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 4.5"/></svg>`;

function updateProgressUI() {
  const completed = getCompletedTopics();
  const total = TOPICS.length;
  const count = completed.length;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  if (catalogProgressFill) {
    catalogProgressFill.style.width = `${percent}%`;
  }
  if (catalogProgressText) {
    catalogProgressText.textContent = `Прогресс: ${count} / ${total} (${percent}%)`;
  }

  // Update Catalog Cards
  document.querySelectorAll(".topic-card").forEach((card) => {
    const id = card.dataset.id;
    const isDone = completed.includes(id);
    card.classList.toggle("completed", isDone);

    const badge = card.querySelector(".topic-badge-completed");
    if (badge) {
      badge.style.display = isDone ? "inline-flex" : "none";
    }

    const toggleBtn = card.querySelector(".card-toggle-complete");
    if (toggleBtn) {
      toggleBtn.classList.toggle("completed", isDone);
      toggleBtn.innerHTML = isDone ? "✓ Пройдено" : "○ Отметить";
    }
  });

  // Update Sidebar
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    const id = item.dataset.id;
    const isDone = completed.includes(id);
    item.classList.toggle("completed", isDone);

    const btn = item.querySelector(".sidebar-checkbox-btn");
    if (btn) {
      btn.classList.toggle("checked", isDone);
      btn.innerHTML = isDone ? CHECK_SVG : "";
      btn.title = isDone ? "Пройдено (нажмите, чтобы снять)" : "Отметить как пройденное";
    }
  });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  TOPICS = await courseSdk.init();
  window.TOPICS = TOPICS;
  renderCatalogTagFilters();
  renderCatalog();
  renderSidebar();
  initBackgroundCanvas();
  initHeroSandbox();
  initHeroMatrixConstellation();
  initEmbeddedIDE();
  setupEventListeners();
  initSearchPalette();
  initTerminalResizer();
  updateProgressUI();
  initPyodide();

  // Restore active topic from URL hash if present
  const hashTopic = window.location.hash.replace(/^#/, "");
  if (hashTopic && TOPICS.some(t => t.id === hashTopic)) {
    openTopicWorkspace(hashTopic, false);
  }

  // Handle browser Back / Forward navigation between topics and catalog
  window.addEventListener("hashchange", () => {
    const currentHash = window.location.hash.replace(/^#/, "");
    if (currentHash && TOPICS.some(t => t.id === currentHash)) {
      openTopicWorkspace(currentHash, false);
    } else {
      showCatalogView(false);
    }
  });
});

// Setup Embedded Modular Python IDE
async function initEmbeddedIDE() {
  if (!embeddedIDE) {
    embeddedIDE = new PythonWebIDEApp({
      mode: 'embedded',
      collapseSidebarOnInit: true
    });
    await embeddedIDE.init();

    if (currentTopic) {
      const savedCode = getSavedTopicCode(currentTopic.id);
      const initialCode = (savedCode !== null && savedCode !== undefined)
        ? savedCode
        : (currentTopic.examples && currentTopic.examples.length > 0 ? currentTopic.examples[0].code : null);
      await embeddedIDE.openTopicProject(currentTopic.id, currentTopic.title, initialCode);
    }
  }
}

// Catalog Tag Filter State
let selectedCatalogTag = "all";

function getUniqueCatalogTags() {
  const tagCountMap = new Map();
  TOPICS.forEach((topic) => {
    if (Array.isArray(topic.tags)) {
      topic.tags.forEach((tag) => {
        const clean = String(tag).trim().toLowerCase();
        if (clean) {
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  return Array.from(tagCountMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([tag, count]) => ({ tag, count }));
}

function renderCatalogTagFilters() {
  if (!catalogTagFilters) return;
  catalogTagFilters.innerHTML = "";

  const uniqueTags = getUniqueCatalogTags();
  if (uniqueTags.length === 0) {
    catalogTagFilters.style.display = "none";
    return;
  }
  catalogTagFilters.style.display = "flex";

  // Pill "Все"
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  const isAllActive = selectedCatalogTag === "all";
  allBtn.className = `catalog-tag-pill ${isAllActive ? "active" : ""}`;
  allBtn.setAttribute("aria-pressed", isAllActive ? "true" : "false");
  allBtn.innerHTML = `<span>Все</span> <span class="tag-count">${TOPICS.length}</span>`;
  allBtn.title = "Показать все темы";
  allBtn.addEventListener("click", () => setSelectedCatalogTag("all"));
  catalogTagFilters.appendChild(allBtn);

  // Individual tag pills
  uniqueTags.forEach(({ tag, count }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isTagActive = selectedCatalogTag === tag;
    btn.className = `catalog-tag-pill ${isTagActive ? "active" : ""}`;
    btn.setAttribute("aria-pressed", isTagActive ? "true" : "false");
    btn.innerHTML = `<span>#${escapeHtml(tag)}</span> <span class="tag-count">${count}</span>`;
    btn.title = `Фильтровать по тегу #${tag}`;
    btn.addEventListener("click", () => {
      setSelectedCatalogTag(selectedCatalogTag === tag ? "all" : tag);
    });
    catalogTagFilters.appendChild(btn);
  });
}

function setSelectedCatalogTag(tag) {
  const normTag = tag ? String(tag).trim().toLowerCase() : "all";
  selectedCatalogTag = normTag;
  renderCatalogTagFilters();
  renderCatalog(searchInput ? searchInput.value : "");
}

// Render Catalog Grid View
function renderCatalog(filter = "") {
  topicsGrid.innerHTML = "";
  const query = filter.toLowerCase().trim();
  const completed = getCompletedTopics();

  const filteredTopics = TOPICS.filter((t) => {
    const matchesTag =
      selectedCatalogTag === "all" ||
      (Array.isArray(t.tags) &&
        t.tags.some((tag) => String(tag).trim().toLowerCase() === selectedCatalogTag));

    const matchesQuery =
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(query)));

    return matchesTag && matchesQuery;
  });

  if (filteredTopics.length === 0) {
    const tagNotice = selectedCatalogTag !== "all" ? ` с тегом «#${escapeHtml(selectedCatalogTag)}»` : "";
    topicsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
        ${query ? `По запросу «${escapeHtml(filter)}»${tagNotice} тем не найдено.` : `Тем с тегом «#${escapeHtml(selectedCatalogTag)}» не найдено.`}
        <div style="margin-top: 12px;">
          <button type="button" class="catalog-tag-pill active" id="resetCatalogFiltersBtn" style="cursor: pointer;">
            Сбросить фильтр
          </button>
        </div>
      </div>
    `;
    const resetBtn = document.getElementById("resetCatalogFiltersBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        setSelectedCatalogTag("all");
      });
    }
    return;
  }

  filteredTopics.forEach((topic) => {
    const isDone = completed.includes(topic.id);
    const card = document.createElement("div");
    card.className = `topic-card ${isDone ? "completed" : ""}`;
    card.dataset.id = topic.id;

    const itemsHtml = topic.summary
      .map(
        (s) => `
        <div class="topic-card-item">
          <span class="arrow-icon">→</span>
          <div>${escapeHtml(s)}</div>
        </div>
      `
      )
      .join("");

    const tagsHtml = (Array.isArray(topic.tags) && topic.tags.length > 0)
      ? `
        <div class="topic-card-tags">
          ${topic.tags.map((tag) => `
            <span class="topic-card-tag ${tag === selectedCatalogTag ? "active" : ""}" data-tag="${escapeHtml(tag)}">
              #${escapeHtml(tag)}
            </span>
          `).join("")}
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="topic-card-head">
        <div class="topic-card-title-wrap">
          <span>${topic.icon}</span>
          <div class="topic-title-text-wrap">
            <span class="topic-title-text">${escapeHtml(topic.title)}</span>
          </div>
        </div>
        <span class="topic-category-badge">${escapeHtml(topic.category)}</span>
      </div>
      <div class="topic-card-body">
        ${itemsHtml}
        ${tagsHtml}
      </div>
      <div class="topic-card-foot">
        <button class="card-toggle-complete ${isDone ? "completed" : ""}" title="Переключить статус изучения">
          ${isDone ? "✓ Пройдено" : "○ Отметить"}
        </button>
        <span class="open-link">Открыть практику →</span>
      </div>
    `;

    // Dynamic marquee effect on hover for overflowing titles
    card.addEventListener("mouseenter", () => {
      const wrap = card.querySelector(".topic-title-text-wrap");
      const text = card.querySelector(".topic-title-text");
      if (wrap && text) {
        const overflow = text.scrollWidth - wrap.clientWidth;
        if (overflow > 4) {
          card.style.setProperty("--marquee-distance", `-${overflow + 8}px`);
          card.classList.add("marquee-active");
        }
      }
    });

    card.addEventListener("mouseleave", () => {
      card.classList.remove("marquee-active");
      card.style.removeProperty("--marquee-distance");
    });

    const toggleBtn = card.querySelector(".card-toggle-complete");
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTopicCompleted(topic.id);
    });

    // Tag click on card filters by that tag
    card.querySelectorAll(".topic-card-tag").forEach((tagEl) => {
      tagEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const tag = tagEl.dataset.tag;
        setSelectedCatalogTag(selectedCatalogTag === tag ? "all" : tag);
      });
    });

    card.addEventListener("click", () => openTopicWorkspace(topic.id));
    topicsGrid.appendChild(card);
  });
}

// Render Left Sidebar Topics List in Workspace View
function renderSidebar() {
  sidebarTopicsList.innerHTML = "";
  const completed = getCompletedTopics();

  TOPICS.forEach((topic) => {
    const isDone = completed.includes(topic.id);
    const item = document.createElement("div");
    item.className = `sidebar-item ${isDone ? "completed" : ""}`;
    item.dataset.id = topic.id;
    item.innerHTML = `
      <span>${topic.icon}</span>
      <div class="sidebar-text-wrap">
        <span class="sidebar-text">${escapeHtml(topic.title)}</span>
      </div>
      <button class="sidebar-checkbox-btn ${isDone ? "checked" : ""}" title="${isDone ? "Пройдено (нажмите, чтобы снять)" : "Отметить как пройденное"}">
        ${isDone ? CHECK_SVG : ""}
      </button>
    `;

    const checkBtn = item.querySelector(".sidebar-checkbox-btn");
    checkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTopicCompleted(topic.id);
    });

    // Dynamic marquee effect on hover for overflowing titles
    item.addEventListener("mouseenter", () => {
      const wrap = item.querySelector(".sidebar-text-wrap");
      const text = item.querySelector(".sidebar-text");
      if (wrap && text) {
        const overflow = text.scrollWidth - wrap.clientWidth;
        if (overflow > 4) {
          item.style.setProperty("--marquee-distance", `-${overflow + 8}px`);
          item.classList.add("marquee-active");
        }
      }
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("marquee-active");
      item.style.removeProperty("--marquee-distance");
    });

    item.addEventListener("click", () => openTopicWorkspace(topic.id));
    sidebarTopicsList.appendChild(item);
  });
}

// Open Topic in Workspace View
function openTopicWorkspace(topicId, updateHash = true) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return;

  currentTopic = topic;

  if (updateHash && window.location.hash !== `#${topicId}`) {
    history.pushState(null, null, `#${topicId}`);
  }
  try {
    localStorage.setItem(STORAGE_KEY_LAST_TOPIC, topicId);
  } catch (e) {}

  // Switch Views
  catalogView.style.display = "none";
  workspaceView.classList.add("active");

  // Update Sidebar active state
  document.querySelectorAll(".sidebar-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === topicId);
  });

  // Fill Header & Theory
  topicCategoryText.textContent = topic.category;
  topicTitleText.textContent = `${topic.icon} ${topic.title}`;
  theoryBlock.innerHTML = topic.theory;

  // Update completion status button in header
  updateProgressUI();

  // Render Inline Snippet Runners with Prism.js Syntax Highlighting
  snippetsList.innerHTML = "";
  topic.examples.forEach((ex, idx) => {
    const card = document.createElement("div");
    card.className = "snippet-runner-card";

    // Highlight code using Prism
    let highlightedCode = escapeHtml(ex.code);
    if (window.Prism && Prism.languages.python) {
      highlightedCode = Prism.highlight(ex.code, Prism.languages.python, 'python');
    }

    card.innerHTML = `
      <div class="snippet-top-bar">
        <span class="snippet-name">Пример ${idx + 1}: ${escapeHtml(ex.title)}</span>
        <div class="snippet-btn-group">
          <button class="snippet-action-btn copy-code-btn" title="Скопировать код в буфер обмена">
            📋 Копировать
          </button>
          <button class="snippet-action-btn load-ide-btn" title="Загрузить в правую IDE">
            📝 В редактор
          </button>
          <button class="snippet-action-btn primary run-inline-btn" title="Выполнить прямо здесь">
            ▶ Запустить
          </button>
        </div>
      </div>
      ${ex.desc ? `<div class="snippet-description">${escapeHtml(ex.desc)}</div>` : ""}
      <pre class="snippet-code-area language-python"><code class="language-python">${highlightedCode}</code></pre>
      <div class="inline-output-box" id="inlineOut_${topic.id}_${idx}"></div>
    `;

    const copyCodeBtn = card.querySelector(".copy-code-btn");
    const runInlineBtn = card.querySelector(".run-inline-btn");
    const loadIdeBtn = card.querySelector(".load-ide-btn");
    const outputBox = card.querySelector(".inline-output-box");

    // Copy snippet code to clipboard
    copyCodeBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(ex.code);
        const originalHtml = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = "✓ Скопировано";
        copyCodeBtn.classList.add("copied");
        setTimeout(() => {
          copyCodeBtn.innerHTML = originalHtml;
          copyCodeBtn.classList.remove("copied");
        }, 1500);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    });

    // Run snippet directly on the spot (Jupyter-style)
    runInlineBtn.addEventListener("click", async () => {
      outputBox.classList.add("visible");
      outputBox.classList.remove("error");
      outputBox.textContent = "⏳ Выполнение...";
      runInlineBtn.disabled = true;

      const res = await executePythonCode(ex.code);
      if (res.success) {
        outputBox.textContent = res.output || "(Выполнено без вывода в консоль)";
      } else {
        outputBox.classList.add("error");
        let errText = "";
        if (res.output && res.output.trim()) {
          errText += `Вывод:\n${res.output}\n\n`;
        }
        errText += `❌ Ошибка:\n${res.error}`;
        outputBox.textContent = errText;
      }
      runInlineBtn.disabled = false;
    });

    // Load snippet into right CodeMirror IDE
    loadIdeBtn.addEventListener("click", () => {
      loadCodeIntoIde(ex.code);
    });

    snippetsList.appendChild(card);
  });

  // Load or switch to the topic's isolated project in embedded IDE
  const savedCode = getSavedTopicCode(topic.id);
  const initialCode = (savedCode !== null && savedCode !== undefined)
    ? savedCode
    : (topic.examples && topic.examples.length > 0 ? topic.examples[0].code : null);

  if (embeddedIDE) {
    embeddedIDE.openTopicProject(topic.id, topic.title, initialCode);
  }

  // Refresh IDE layout
  setTimeout(() => {
    if (embeddedIDE && embeddedIDE.editor && embeddedIDE.editor.editorInstance) {
      embeddedIDE.editor.editorInstance.layout();
    }
  }, 50);
}

// Load code into right IDE pane
function loadCodeIntoIde(code, saveToStorage = true) {
  if (embeddedIDE) {
    embeddedIDE.setCode(code);
  }
  if (saveToStorage && currentTopic) {
    saveTopicCode(currentTopic.id, code);
  } else {
    showSaveStatus();
  }
}

// Switch back to Catalog
function showCatalogView(updateHash = true) {
  workspaceView.classList.remove("active");
  catalogView.style.display = "block";
  if (updateHash) {
    history.pushState(null, null, window.location.pathname + window.location.search);
  }
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_TOPIC);
  } catch (e) {}
}

// Execute Python Code via Web Worker Bridge
function executePythonCode(code) {
  return new Promise((resolve) => {
    let outputText = "";
    let errorText = "";
    const startTime = performance.now();

    const onStdout = (e) => {
      outputText += e.detail;
    };
    const onStderr = (e) => {
      errorText += e.detail;
    };

    const cleanup = () => {
      workerBridge.removeEventListener("stdout", onStdout);
      workerBridge.removeEventListener("stderr", onStderr);
      workerBridge.removeEventListener("finished", onFinished);
    };

    const onFinished = (e) => {
      cleanup();
      const duration = (performance.now() - startTime).toFixed(1);
      if (e.detail.success) {
        resolve({ success: true, output: outputText, duration });
      } else {
        resolve({
          success: false,
          output: outputText,
          error: errorText || e.detail.error || "Ошибка выполнения",
          duration
        });
      }
    };

    workerBridge.addEventListener("stdout", onStdout);
    workerBridge.addEventListener("stderr", onStderr);
    workerBridge.addEventListener("finished", onFinished);

    workerBridge.run({ "/main.py": code }, "/main.py");
  });
}

// Run code from right IDE via Web Worker
function runIdeCode() {
  if (!monacoEditor) return;
  const code = monacoEditor.getValue().trim();
  if (!code) return;

  terminalBody.classList.remove("empty");
  terminalBody.textContent = "⏳ Выполняется...\n";
  runIdeBtn.style.display = "none";
  if (stopIdeBtn) {
    stopIdeBtn.style.display = "inline-flex";
  }

  const startTime = performance.now();
  let stdoutBuffer = "";
  let stderrBuffer = "";

  const onStdout = (e) => {
    stdoutBuffer += e.detail;
    terminalBody.textContent = stdoutBuffer + (stderrBuffer ? "\n" + stderrBuffer : "");
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };

  const onStderr = (e) => {
    stderrBuffer += e.detail;
    terminalBody.textContent = stdoutBuffer + (stderrBuffer ? "\n" + stderrBuffer : "");
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };

  const cleanup = () => {
    workerBridge.removeEventListener("stdout", onStdout);
    workerBridge.removeEventListener("stderr", onStderr);
    workerBridge.removeEventListener("finished", onFinished);
    if (stopIdeBtn) {
      stopIdeBtn.style.display = "none";
    }
    runIdeBtn.style.display = "inline-flex";
    runIdeBtn.disabled = false;
  };

  const onFinished = (e) => {
    cleanup();
    const duration = (performance.now() - startTime).toFixed(1);

    if (e.detail.success) {
      const text = stdoutBuffer || "(Программа выполнена успешно без вывода в консоль)";
      terminalBody.innerHTML = `<span class="term-info">▶ Выполнено за ${duration} мс:</span>\n${escapeHtml(text)}`;
    } else {
      let html = "";
      if (stdoutBuffer && stdoutBuffer.trim()) {
        html += `<span class="term-info">▶ Вывод до остановки:</span>\n${escapeHtml(stdoutBuffer)}\n\n`;
      }
      const err = e.detail.terminated
        ? "[Процесс принудительно остановлен пользователем]"
        : (stderrBuffer || e.detail.error || "Неизвестная ошибка");
      html += `<span class="term-error">❌ ${escapeHtml(err)}</span>`;
      terminalBody.innerHTML = html;
    }
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };

  workerBridge.addEventListener("stdout", onStdout);
  workerBridge.addEventListener("stderr", onStderr);
  workerBridge.addEventListener("finished", onFinished);

  workerBridge.run({ "/main.py": code }, "/main.py");
}

// Initialize Pyodide Web Worker Runner
function initPyodide() {
  workerBridge.addEventListener("status", (e) => {
    updateStatus(e.detail.status);
  });

  workerBridge.addEventListener("request-input", async (e) => {
    const { id, prompt } = e.detail;
    try {
      const val = await window.showCustomInputModal(prompt);
      workerBridge.sendInputResponse(id, val, false);
    } catch (err) {
      workerBridge.sendInputResponse(id, null, true);
    }
  });

  workerBridge.initWorker();
  updateStatus(workerBridge.status || "loading");
}

function updateStatus(state) {
  if (statusText) {
    statusText.textContent = "Python 3.12";
    statusText.style.display = "inline";
  }
  if (statusDot) {
    statusDot.className = `status-dot ${state}`;
  }

  if (state === "ready") {
    if (runIdeBtn && !workerBridge.isRunning) runIdeBtn.disabled = false;
    if (stepDebugBtn && !workerBridge.isRunning) stepDebugBtn.disabled = false;
  } else if (state === "loading") {
    if (runIdeBtn) runIdeBtn.disabled = true;
    if (stepDebugBtn) stepDebugBtn.disabled = true;
  }
}

// Event Listeners
function setupEventListeners() {
  if (brandHomeLink) {
    brandHomeLink.addEventListener("click", (e) => {
      e.preventDefault();
      showCatalogView();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderCatalog(e.target.value);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        searchInput.value = "";
        searchInput.placeholder = SEARCH_PLACEHOLDERS.CATALOG;
        renderCatalog("");
        searchInput.blur();
      }
    });
  }

  if (runIdeBtn) {
    runIdeBtn.addEventListener("click", () => {
      if (isDebugActive) exitDebugMode();
      runIdeCode();
    });
  }

  if (stopIdeBtn) {
    stopIdeBtn.addEventListener("click", () => {
      workerBridge.terminate();
    });
  }

  if (topicCompleteBtn) {
    topicCompleteBtn.addEventListener("click", () => {
      if (currentTopic) {
        toggleTopicCompleted(currentTopic.id);
      }
    });
  }

  if (resetCodeBtn) {
    resetCodeBtn.addEventListener("click", () => {
      if (isDebugActive) exitDebugMode();
      if (currentExampleCode && currentTopic) {
        removeSavedTopicCode(currentTopic.id);
        loadCodeIntoIde(currentExampleCode, false);
        showSaveStatus();
      }
    });
  }

  if (formatCodeBtn) {
    formatCodeBtn.addEventListener("click", formatIdeCode);
  }

  if (clearTermBtn) {
    clearTermBtn.addEventListener("click", () => {
      if (terminalBody) {
        terminalBody.textContent = "Консоль очищена.";
        terminalBody.classList.add("empty");
      }
    });
  }

  // Hotkeys Modal
  if (hotkeysModalBtn && hotkeysModal) {
    hotkeysModalBtn.addEventListener("click", () => {
      hotkeysModal.style.display = "flex";
    });
  }

  if (closeHotkeysModalBtn && hotkeysModal) {
    closeHotkeysModalBtn.addEventListener("click", () => {
      hotkeysModal.style.display = "none";
    });
  }

  if (hotkeysModal) {
    hotkeysModal.addEventListener("click", (e) => {
      if (e.target === hotkeysModal) {
        hotkeysModal.style.display = "none";
      }
    });
  }

  // Custom Input Modal Handlers
  if (customInputForm) {
    customInputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      closeCustomInputModal(false, customInputField.value);
    });
  }

  if (customInputCancelBtn) {
    customInputCancelBtn.addEventListener("click", () => {
      closeCustomInputModal(true);
    });
  }

  if (customInputModal) {
    customInputModal.addEventListener("click", (e) => {
      if (e.target === customInputModal) {
        closeCustomInputModal(true);
      }
    });
  }

  // Global hotkeys
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (customInputModal && customInputModal.style.display === "flex") {
        e.preventDefault();
        closeCustomInputModal(true);
        return;
      }
      if (hotkeysModal && hotkeysModal.style.display === "flex") {
        e.preventDefault();
        hotkeysModal.style.display = "none";
        return;
      }
      if (workspaceView.classList.contains("active")) {
        showCatalogView();
      }
    }

    if (e.code === "F10" || e.key === "F10") {
      e.preventDefault();
      if (embeddedIDE && typeof embeddedIDE.stepActiveCode === "function") {
        embeddedIDE.stepActiveCode();
      }
    }
  });
}

// Vertical Resizer for Output Terminal
function initTerminalResizer() {
  const STORAGE_KEY_PRACTICE_TERMINAL_HEIGHT = "learn_py_practice_terminal_height";
  const terminalPane = document.getElementById("ideTerminalPane") || document.querySelector(".ide-terminal-pane");
  const resizer = document.getElementById("terminalResizer") || document.querySelector(".terminal-top");
  const idePane = document.querySelector(".workspace-ide-pane");
  if (!terminalPane || !resizer || !idePane) return;

  // Restore saved terminal height
  try {
    const savedHeight = localStorage.getItem(STORAGE_KEY_PRACTICE_TERMINAL_HEIGHT);
    if (savedHeight) {
      terminalPane.style.height = `${parseFloat(savedHeight)}px`;
    }
  } catch (e) {
    console.error("Error loading saved terminal height:", e);
  }

  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  const onDragStart = (clientY) => {
    isDragging = true;
    startY = clientY;
    startHeight = terminalPane.getBoundingClientRect().height;

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    terminalPane.classList.add("resizing");
  };

  const onDragMove = (clientY) => {
    if (!isDragging) return;

    const deltaY = startY - clientY;
    const ideHeight = idePane.getBoundingClientRect().height;
    const minHeight = 34; // Allow collapsing down to header
    const maxHeight = Math.max(ideHeight - 80, minHeight);

    const newHeight = Math.min(Math.max(startHeight + deltaY, minHeight), maxHeight);
    terminalPane.style.height = `${newHeight}px`;

    if (monacoEditor) {
      monacoEditor.layout();
    }
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    terminalPane.classList.remove("resizing");

    try {
      localStorage.setItem(STORAGE_KEY_PRACTICE_TERMINAL_HEIGHT, String(terminalPane.getBoundingClientRect().height));
    } catch (e) {}

    if (monacoEditor) {
      monacoEditor.layout();
    }
  };

  // Mouse events
  resizer.addEventListener("mousedown", (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    onDragStart(e.clientY);
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      onDragMove(e.clientY);
    }
  });

  document.addEventListener("mouseup", onDragEnd);

  // Touch events (for mobile/tablet support)
  resizer.addEventListener("touchstart", (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    if (e.touches.length === 1) {
      onDragStart(e.touches[0].clientY);
    }
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
      onDragMove(e.touches[0].clientY);
    }
  }, { passive: true });

  document.addEventListener("touchend", onDragEnd);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===================================================
// COMMAND PALETTE / SMART METHOD & CODE SEARCH ENGINE
// ===================================================
let searchIndex = [];

function extractMethodTokens(text) {
  // Extract identifiers like .sort, append, re.findall, strftime, etc.
  const tokens = [];
  const matches = text.match(/\b([a-zA-Z_][a-zA-Z0-9_.]*)\b/g) || [];
  const stopWords = new Set([
    "a", "b", "c", "d", "e", "f", "x", "y", "z", "n", "t", "s", "k", "v",
    "the", "in", "is", "not", "and", "or", "to", "for", "of", "items", "obj",
    "value", "values", "val", "key", "keys", "func", "statement", "iterable",
    "start", "stop", "step", "index", "data"
  ]);

  matches.forEach(m => {
    const clean = m.replace(/^\.+|\.+$/g, "");
    if (clean.length >= 3 && !stopWords.has(clean.toLowerCase())) {
      tokens.push(clean);
      // If token is obj.method (e.g. items.sort), also add the method name alone (sort)
      if (clean.includes(".")) {
        const parts = clean.split(".");
        const methodName = parts[parts.length - 1];
        if (methodName.length >= 3 && !stopWords.has(methodName.toLowerCase())) {
          tokens.push(methodName);
        }
      }
    }
  });

  return Array.from(new Set(tokens));
}

function isMethodOrSyntaxLine(text, topicId) {
  if (!text || topicId === "roadmap") return false;
  // Exclude roadmap progression paths and arrows
  if (text.includes("→") || text.includes("->")) return false;

  // Must contain code syntax indicators: (), [], ., :, =, |, @, operators, or Python keywords
  const hasCodeSyntax = /[()[\]{}.:=+\-*\/|@<>]|\b(def|class|import|from|with|lambda|assert|yield|try|except|raise|return|for|while|if|elif|else|in|is|not|and|or)\b/i.test(text);
  return hasCodeSyntax;
}

function findBestExampleForTokens(topic, tokens) {
  if (!topic.examples || topic.examples.length === 0) return -1;
  if (!tokens || tokens.length === 0) return -1;

  let bestIndex = -1;
  let highestScore = 0;

  topic.examples.forEach((ex, idx) => {
    let score = 0;
    const codeLower = ex.code.toLowerCase();
    const titleLower = ex.title.toLowerCase();
    const descLower = (ex.desc || "").toLowerCase();

    tokens.forEach(tok => {
      const t = tok.toLowerCase();
      // Match in code
      if (codeLower.includes(t)) score += 10;
      // Match in title
      if (titleLower.includes(t)) score += 15;
      // Match in description
      if (descLower.includes(t)) score += 5;
    });

    if (score > highestScore) {
      highestScore = score;
      bestIndex = idx;
    }
  });

  return bestIndex;
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildSearchIndex() {
  searchIndex = [];

  TOPICS.forEach((topic) => {
    const cleanTheory = stripHtml(topic.theory || "").toLowerCase();

    // 1. Topic entry (points to its first example by default, or best matching)
    searchIndex.push({
      type: "topic",
      badge: topic.category,
      badgeType: "category",
      title: `${topic.icon} ${topic.title}`,
      topicTitle: topic.title,
      desc: topic.summary.slice(0, 3).join(" • "),
      topicId: topic.id,
      code: topic.examples.length > 0 ? topic.examples[0].code : "",
      exampleIndex: 0,
      theoryText: cleanTheory,
      keywords: `${topic.title} ${topic.category}`.toLowerCase()
    });

    // 2. Code examples (direct snippet search by title, description and real Python code)
    topic.examples.forEach((ex, exIdx) => {
      searchIndex.push({
        type: "example",
        badge: `Пример #${exIdx + 1}`,
        badgeType: "code",
        title: ex.title,
        desc: ex.desc || `Тема: «${topic.title}»`,
        codePreview: ex.code.split("\n").slice(0, 2).join(" | "),
        code: ex.code,
        topicId: topic.id,
        exampleIndex: exIdx,
        keywords: `${ex.title} ${ex.desc || ""} ${ex.code}`.toLowerCase()
      });
    });
  });
}

function initSearchPalette() {
  buildSearchIndex();

  if (globalSearchBtn) {
    globalSearchBtn.addEventListener("click", openSearchPalette);
  }

  if (paletteSearchInput) {
    paletteSearchInput.addEventListener("input", (e) => {
      performPaletteSearch(e.target.value);
    });

    paletteSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigatePaletteResults(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigatePaletteResults(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectPaletteResult(activePaletteIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeSearchPalette();
      }
    });
  }

  if (searchPaletteModal) {
    searchPaletteModal.addEventListener("click", (e) => {
      if (e.target === searchPaletteModal) {
        closeSearchPalette();
      }
    });
  }

  // Global hotkey: / (when not typing in an input/textarea/editor)
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !document.activeElement.closest(".monaco-editor")) {
      e.preventDefault();
      openSearchPalette();
    }
  });
}

function openSearchPalette() {
  if (!searchPaletteModal || !paletteSearchInput) return;
  searchPaletteModal.style.display = "flex";
  paletteSearchInput.value = "";
  paletteSearchInput.placeholder = SEARCH_PLACEHOLDERS.PALETTE;
  performPaletteSearch("");
  setTimeout(() => paletteSearchInput.focus(), 50);
}

function closeSearchPalette() {
  if (!searchPaletteModal) return;
  searchPaletteModal.style.display = "none";
  if (paletteSearchInput) {
    paletteSearchInput.value = "";
    paletteSearchInput.placeholder = SEARCH_PLACEHOLDERS.PALETTE;
    paletteSearchInput.blur();
  }
  paletteResults = [];
  activePaletteIndex = 0;
}

function performPaletteSearch(query) {
  const q = query.toLowerCase().trim();
  // Strip trailing punctuation like ?, !, :, etc., for natural language queries
  const cleanQ = q.replace(/[?!,.:;]/g, " ").replace(/\s+/g, " ").trim();

  if (!q) {
    // Show top curated topics & methods by default
    paletteResults = searchIndex.slice(0, 15);
  } else {
    // Search with priority scoring across tiered relevance levels
    const scoredResults = [];

    searchIndex.forEach((item) => {
      let score = 0;
      let hasDirectMatch = false;
      const titleLower = item.title.toLowerCase();
      const codeLower = (item.code || "").toLowerCase();
      const keywordsLower = item.keywords || "";
      const theoryLower = item.theoryText || "";

      // Clean topic title (removing icon / emojis and auxiliary brackets for exact matching)
      const rawTopicTitle = (item.topicTitle || item.title.replace(/^[^\p{L}\p{N}]*\s*/u, "")).toLowerCase().trim();
      const baseTopicTitle = rawTopicTitle.replace(/\s*\([^)]*\)/g, "").trim();

      // =========================================================================
      // УРОВЕНЬ 1: Название темы (type: "topic")
      // =========================================================================
      if (item.type === "topic") {
        if (baseTopicTitle === q || rawTopicTitle === q || (cleanQ && (baseTopicTitle === cleanQ || rawTopicTitle === cleanQ))) {
          // Точное совпадение с названием темы/раздела
          score += 1200;
          hasDirectMatch = true;
        } else if (baseTopicTitle.startsWith(q) || rawTopicTitle.startsWith(q) || (cleanQ && (baseTopicTitle.startsWith(cleanQ) || rawTopicTitle.startsWith(cleanQ)))) {
          // Название темы начинается с поискового запроса
          score += 800;
          hasDirectMatch = true;
        } else if (rawTopicTitle.includes(q) || (cleanQ && rawTopicTitle.includes(cleanQ))) {
          // Вхождение в название темы
          score += 500;
          hasDirectMatch = true;
        } else if (keywordsLower.includes(q) || (cleanQ && keywordsLower.includes(cleanQ))) {
          // Совпадение в описании/summary самой темы
          score += 60;
          hasDirectMatch = true;
        } else if (cleanQ && cleanQ.length >= 3 && theoryLower.includes(cleanQ)) {
          // Совпадение по тексту раздела теории урока (напр. "что такое python", концепции)
          score += 90;
          hasDirectMatch = true;
        }
      }

      // =========================================================================
      // УРОВЕНЬ 2 & 3: Заголовки методов/примеров и код (type: "method" | "example")
      // Дочерние элементы обязаны иметь прямое совпадение в своём названии, синтаксисе или коде!
      // =========================================================================
      if (item.type === "method" || item.type === "example") {
        const itemCleanTitle = titleLower.replace(/^[^\p{L}\p{N}]*\s*/u, "").trim();
        if (itemCleanTitle === q || titleLower === q || (cleanQ && (itemCleanTitle === cleanQ || titleLower === cleanQ))) {
          score += 350;
          hasDirectMatch = true;
        } else if (itemCleanTitle.startsWith(q) || titleLower.startsWith(q) || (cleanQ && (itemCleanTitle.startsWith(cleanQ) || titleLower.startsWith(cleanQ)))) {
          score += 250;
          hasDirectMatch = true;
        } else if (titleLower.includes(q) || (cleanQ && titleLower.includes(cleanQ))) {
          score += 160;
          hasDirectMatch = true;
        }

        // Совпадение в коде самого примера
        if (codeLower.includes(q) || (cleanQ && cleanQ.length >= 3 && codeLower.includes(cleanQ))) {
          score += 70;
          hasDirectMatch = true;
        }

        // Совпадение в собственных токенах метода/примера
        if (keywordsLower.includes(q) || (cleanQ && cleanQ.length >= 3 && keywordsLower.includes(cleanQ))) {
          score += 30;
          hasDirectMatch = true;
        }
      }

      if (hasDirectMatch && score > 0) {
        scoredResults.push({ ...item, score });
      }
    });

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);
    paletteResults = scoredResults.slice(0, 25);
  }

  activePaletteIndex = 0;
  renderPaletteResults(q);
}

function highlightQuery(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(regex, '<span class="search-match-highlight">$1</span>');
}

function renderPaletteResults(query = "") {
  if (!paletteResultsList) return;
  paletteResultsList.innerHTML = "";

  if (paletteResults.length === 0) {
    paletteResultsList.innerHTML = `
      <div class="search-palette-empty">
        По запросу «<strong>${escapeHtml(query)}</strong>» ничего не найдено.<br>
        Попробуйте ввести <code>.append</code>, <code>sort</code>, <code>f-string</code>, <code>try-except</code>...
      </div>
    `;
    return;
  }

  paletteResults.forEach((res, idx) => {
    const itemEl = document.createElement("div");
    itemEl.className = `palette-result-item ${idx === activePaletteIndex ? "active" : ""}`;
    itemEl.dataset.index = idx;

    const badgeClass = res.badgeType === "method" ? "palette-result-badge method" : "palette-result-badge";

    let codePreviewHtml = "";
    if (res.codePreview) {
      codePreviewHtml = `<div class="palette-result-code">${highlightQuery(res.codePreview, query)}</div>`;
    }

    itemEl.innerHTML = `
      <div class="palette-result-head">
        <div class="palette-result-title">
          <span>${highlightQuery(res.title, query)}</span>
        </div>
        <span class="${badgeClass}">${escapeHtml(res.badge)}</span>
      </div>
      <div class="palette-result-desc">${highlightQuery(res.desc, query)}</div>
      ${codePreviewHtml}
    `;

    itemEl.addEventListener("mouseenter", () => {
      activePaletteIndex = idx;
      updateActivePaletteItem();
    });

    itemEl.addEventListener("click", () => {
      selectPaletteResult(idx);
    });

    paletteResultsList.appendChild(itemEl);
  });
}

function navigatePaletteResults(direction) {
  if (paletteResults.length === 0) return;
  activePaletteIndex = (activePaletteIndex + direction + paletteResults.length) % paletteResults.length;
  updateActivePaletteItem();

  // Scroll active item into view
  const activeEl = paletteResultsList.querySelector(`.palette-result-item[data-index="${activePaletteIndex}"]`);
  if (activeEl) {
    activeEl.scrollIntoView({ block: "nearest" });
  }
}

function updateActivePaletteItem() {
  const items = paletteResultsList.querySelectorAll(".palette-result-item");
  items.forEach((el, idx) => {
    el.classList.toggle("active", idx === activePaletteIndex);
  });
}

function triggerPulseHighlight(element, scrollBlock = "center") {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: scrollBlock });
  element.classList.remove("snippet-jump-pulse");
  void element.offsetWidth;
  element.classList.add("snippet-jump-pulse");
  element.addEventListener(
    "animationend",
    () => {
      element.classList.remove("snippet-jump-pulse");
    },
    { once: true }
  );
}

function selectPaletteResult(index) {
  const result = paletteResults[index];
  if (!result) return;

  const targetExampleIndex = result.type === "topic" ? 0 : result.exampleIndex;

  closeSearchPalette();

  // 1. Open Workspace Topic (restores user saved code if present, otherwise loads first example)
  openTopicWorkspace(result.topicId);

  // Сбрасываем предыдущую подсветку со всех карточек и блока теории
  const theoryCard = document.getElementById("theoryBlock");
  if (theoryCard) theoryCard.classList.remove("snippet-jump-pulse");
  document.querySelectorAll(".snippet-runner-card").forEach((card) => {
    card.classList.remove("snippet-jump-pulse");
  });

  // 2. Подсвечиваем строго целевой элемент: либо только блок теории, либо только конкретный пример
  if (result.type === "topic") {
    setTimeout(() => {
      triggerPulseHighlight(theoryCard);
    }, 120);
  } else if (targetExampleIndex !== undefined && targetExampleIndex !== null) {
    setTimeout(() => {
      const snippetCards = document.querySelectorAll(".snippet-runner-card");
      const targetCard = snippetCards[targetExampleIndex] || snippetCards[0];
      triggerPulseHighlight(targetCard);
    }, 120);
  }
}

// ===================================================
// HERO QUICK-RUN INTERACTIVE SANDBOX ENGINE
// ===================================================
const HERO_PRESETS = {
  mandelbrot: {
    title: "Космический фрактал Жюлиа (Unicode HD)",
    code: `import math

# Генератор космического фрактала Жюлиа с Unicode-градиентом
def render_fractal():
    w, h = 58, 22
    c = complex(-0.7269, 0.1889) # Координаты электрической спирали
    palette = " .·:;+=xX$&#█"

    print("🌌 ФРАКТАЛ МНОЖЕСТВА ЖЮЛИА (z² + c):")
    print("┌" + "─" * w + "┐")
    for y in range(h):
        line = []
        for x in range(w):
            zx = 1.35 * (x - w / 2) / (0.5 * w)
            zy = 1.05 * (y - h / 2) / (0.5 * h)
            z = complex(zx, zy)

            i = 0
            max_iter = 36
            while abs(z) < 4.0 and i < max_iter:
                z = z * z + c
                i += 1

            if i == max_iter:
                line.append("█")
            else:
                # Непрерывное логарифмическое сглаживание потенциала
                nu = math.log2(max(1.0, math.log(abs(z) + 1e-9)))
                idx = max(0, min(len(palette) - 2, int((i + 1 - nu) * 0.42)))
                line.append(palette[idx])
        print("│" + "".join(line) + "│")
    print("└" + "─" * w + "┘")
    print("Фрактал Жюлиа z ⟵ z² + (-0.7269 + 0.1889i)")

render_fractal()`
  },
  ascii_art: {
    title: "Генератор логотипа & Системной информации",
    code: `import sys, math

logo = [
  r"   ____         _   _                   ",
  r"  |  _ \\ _   _ | |_| |__   ___  _ __    ",
  r"  | |_) | | | || __| '_ \\ / _ \\| '_ \\   ",
  r"  |  __/| |_| || |_| | | | (_) | | | |  ",
  r"  |_|    \\__, | \\__|_| |_|\\___/|_| |_|  ",
  r"         |___/                          "
]

for row in logo:
    print(row)

print("🐍 Python Interactive Lab Engine")
print(f"Версия языка: Python {sys.version.split()[0]}")
print(f"Константа π = {math.pi:.6f}, e = {math.e:.6f}")`
  },
  neural_net: {
    title: "Обучение нейросети на чистом Python (XOR & Backprop)",
    code: `import math, random

# 1. Данные для обучения логической функции XOR
dataset = [
    ([0, 0], 0),
    ([0, 1], 1),
    ([1, 0], 1),
    ([1, 1], 0)
]

# 2. Инициализация весов нейросети (2 входа -> 2 скрытых -> 1 выход)
random.seed(42)
w1 = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(2)]
b1 = [0.0, 0.0]
w2 = [random.uniform(-1, 1), random.uniform(-1, 1)]
b2 = 0.0

def sigmoid(x): return 1.0 / (1.0 + math.exp(-max(-500, min(500, x))))
def d_sigmoid(y): return y * (1.0 - y)

# 3. Цикл обучения (1500 эпох градиентного спуска)
lr = 0.8
for epoch in range(1500):
    for x, target in dataset:
        # Прямой проход (Forward pass)
        h = [sigmoid(x[0]*w1[0][i] + x[1]*w1[1][i] + b1[i]) for i in range(2)]
        out = sigmoid(h[0]*w2[0] + h[1]*w2[1] + b2)

        # Обратное распространение ошибки (Backpropagation)
        err = target - out
        delta_out = err * d_sigmoid(out)
        delta_h = [delta_out * w2[i] * d_sigmoid(h[i]) for i in range(2)]

        # Коррекция весов
        w2[0] += lr * delta_out * h[0]
        w2[1] += lr * delta_out * h[1]
        b2 += lr * delta_out
        for i in range(2):
            w1[0][i] += lr * delta_h[i] * x[0]
            w1[1][i] += lr * delta_h[i] * x[1]
            b1[i] += lr * delta_h[i]

# 4. Проверка и демонстрация предсказаний
print("🧠 НЕЙРОСЕТЬ ОБУЧЕНА (Задача нелинейного XOR):")
print("---------------------------------------------")
for x, target in dataset:
    h = [sigmoid(x[0]*w1[0][i] + x[1]*w1[1][i] + b1[i]) for i in range(2)]
    pred = sigmoid(h[0]*w2[0] + h[1]*w2[1] + b2)
    res_bool = 1 if pred > 0.5 else 0
    status = "✅" if res_bool == target else "❌"
    print(f" Вход: {x} -> Предсказание: {pred:.4f} (Класс: {res_bool}) {status}")
print("---------------------------------------------")
print("Точность: 100.0% | Обучение на чистом Python без библиотек!")`
  }
};

let currentHeroPresetKey = "ascii_art";

function initHeroSandbox() {
  const codeSnippet = document.getElementById("heroCodeSnippet");
  const terminalOutput = document.getElementById("heroTerminalOutput");
  const runBtn = document.getElementById("heroRunBtn");
  const execTimeBadge = document.getElementById("heroExecTimeBadge");
  const openFullIdeBtn = document.getElementById("heroOpenFullIdeBtn");
  const tabBtns = document.querySelectorAll(".hero-tab-btn");

  if (!codeSnippet || !terminalOutput || !runBtn) return;

  function loadPreset(key) {
    currentHeroPresetKey = key;
    const preset = HERO_PRESETS[key] || HERO_PRESETS.ascii_art;

    tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === key);
    });

    codeSnippet.textContent = preset.code;
    if (window.Prism) {
      Prism.highlightElement(codeSnippet);
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      loadPreset(btn.dataset.preset);
    });
  });

  loadPreset("ascii_art");

  runBtn.addEventListener("click", async () => {
    const preset = HERO_PRESETS[currentHeroPresetKey];
    if (!preset) return;

    runBtn.disabled = true;
    runBtn.innerHTML = "<span>⏳</span> Запуск...";
    execTimeBadge.textContent = "выполнение...";
    terminalOutput.textContent = "Выполнение скрипта в песочнице...";

    try {
      const res = await executePythonCode(preset.code);
      const elapsed = Math.round(parseFloat(res.duration) || 0);

      if (res.success) {
        terminalOutput.textContent = res.output || "[Скрипт выполнен без вывода]";
        execTimeBadge.textContent = `⚡ ${elapsed} мс`;
      } else {
        let errText = "";
        if (res.output && res.output.trim()) {
          errText += `Вывод:\n${res.output}\n\n`;
        }
        errText += `Ошибка выполнения:\n${res.error}`;
        terminalOutput.textContent = errText;
        execTimeBadge.textContent = "ошибка";
      }
    } catch (err) {
      console.error("Hero Run Error:", err);
      terminalOutput.textContent = `Ошибка выполнения:\n${err.message || err}`;
      execTimeBadge.textContent = "ошибка";
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = "<span>▶</span> Запустить";
    }
  });
}

// ===================================================
// HERO MATRIX & PYTHON KEYWORDS CONSTELLATION ENGINE
// ===================================================
function initHeroMatrixConstellation() {
  const canvas = document.getElementById("heroMatrixCanvas");
  const heroBlock = document.getElementById("catalogHero");
  if (!canvas || !heroBlock) return;

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let animId = null;

  function resize() {
    const rect = heroBlock.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  const KEYWORDS = [
    "def", "async", "await", "yield", "class", "import", "lambda",
    "return", "try", "except", "match", "with", "self", "__init__",
    "None", "True", "False", "@decorator", "list", "dict", "str"
  ];

  // Create floating nodes with keywords
  const nodes = [];
  const NODE_COUNT = Math.min(22, Math.max(12, Math.floor(width / 50)));

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      word: KEYWORDS[i % KEYWORDS.length],
      size: Math.random() * 2 + 10.5,
      alpha: Math.random() * 0.35 + 0.15,
      baseAlpha: Math.random() * 0.35 + 0.15,
      isKeyword: Math.random() > 0.35,
      color: Math.random() > 0.4 ? "#38bdf8" : "#ff6b00"
    });
  }

  let mouse = {
    x: -9999,
    y: -9999,
    radius: 120
  };

  heroBlock.addEventListener("mousemove", (e) => {
    const rect = heroBlock.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  heroBlock.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  function draw() {
    if (document.hidden || (workspaceView && workspaceView.classList.contains("active"))) {
      animId = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Draw subtle background cyber-matrix grid dots
    ctx.fillStyle = "rgba(255, 107, 0, 0.05)";
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 2. Update and draw nodes & keywords
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      n.x += n.vx;
      n.y += n.vy;

      // Bounce off boundaries
      if (n.x < 10) { n.x = 10; n.vx *= -1; }
      if (n.x > width - 10) { n.x = width - 10; n.vx *= -1; }
      if (n.y < 10) { n.y = 10; n.vy *= -1; }
      if (n.y > height - 10) { n.y = height - 10; n.vy *= -1; }

      // Mouse interactive repelling and glowing
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.hypot(dx, dy);

      if (dist < mouse.radius) {
        const force = (1 - dist / mouse.radius) * 1.8;
        const angle = Math.atan2(dy, dx);
        n.x += Math.cos(angle) * force * 2;
        n.y += Math.sin(angle) * force * 2;
        n.alpha = Math.min(0.85, n.baseAlpha + 0.5);
      } else {
        n.alpha += (n.baseAlpha - n.alpha) * 0.05;
      }

      ctx.save();
      ctx.globalAlpha = n.alpha;

      if (n.isKeyword) {
        ctx.font = `600 ${n.size}px "JetBrains Mono", Consolas, monospace`;
        ctx.fillStyle = n.color;
        ctx.fillText(n.word, n.x, n.y);
      } else {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Draw constellation lines between nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const lineDist = Math.hypot(n.x - n2.x, n.y - n2.y);
        if (lineDist < 110) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.18 * (1 - lineDist / 110)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  animId = requestAnimationFrame(draw);
}

// ===================================================
// RETRO 8-BIT GRID-BASED GAME SNAKE ENGINE
// ===================================================
function initBackgroundCanvas() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let animationFrameId = null;

  const GRID_SIZE = 16; // Exact arcade cell size
  let cols = 0;
  let rows = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(10, Math.floor(width / GRID_SIZE));
    rows = Math.max(10, Math.floor(height / GRID_SIZE));
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Snake State on Grid Coordinates
  let snake = [];
  const INITIAL_LENGTH = 18;
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };

  // Snake Score & High Score State
  const STORAGE_KEY_SNAKE_HIGHSCORE = "learn_py_snake_highscore";
  let snakeCurrentScore = 0;
  let snakeHighScore = 0;
  try {
    snakeHighScore = parseInt(localStorage.getItem(STORAGE_KEY_SNAKE_HIGHSCORE) || "0", 10) || 0;
  } catch (e) {
    snakeHighScore = 0;
  }

  const snakeCurrentScoreEl = document.getElementById("snakeCurrentScore");
  const snakeHighScoreEl = document.getElementById("snakeHighScore");

  function updateSnakeScoreHUD(pulse = false) {
    if (snakeCurrentScoreEl) {
      snakeCurrentScoreEl.textContent = snakeCurrentScore;
      if (pulse) {
        snakeCurrentScoreEl.classList.remove("pulse");
        void snakeCurrentScoreEl.offsetWidth;
        snakeCurrentScoreEl.classList.add("pulse");
        setTimeout(() => snakeCurrentScoreEl.classList.remove("pulse"), 250);
      }
    }
    if (snakeHighScoreEl) {
      snakeHighScoreEl.textContent = snakeHighScore;
    }
  }
  updateSnakeScoreHUD();

  // Keyboard Navigation (WASD & Arrows) & Space Turbo State
  let manualKeyDir = null;
  let isSpaceTurbo = false;
  let lastKeyboardTime = 0;

  window.addEventListener("keydown", (e) => {
    // Ignore when typing inside inputs, textareas, search palettes, modals, or code editor
    if (
      e.target.closest("input, textarea, select, .monaco-editor") ||
      (searchPaletteModal && searchPaletteModal.style.display === "flex") ||
      (customInputModal && customInputModal.style.display === "flex") ||
      (hotkeysModal && hotkeysModal.style.display === "flex") ||
      (workspaceView && workspaceView.classList.contains("active"))
    ) {
      return;
    }

    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      isSpaceTurbo = true;
      return;
    }

    let newDir = null;
    const code = e.code;
    const key = e.key ? e.key.toLowerCase() : "";

    // WASD + Arrow Keys + Russian layout support (Ц, Ф, Ы, В)
    if (code === "KeyW" || key === "w" || key === "ц" || code === "ArrowUp" || key === "arrowup") {
      newDir = { x: 0, y: -1 };
    } else if (code === "KeyS" || key === "s" || key === "ы" || code === "ArrowDown" || key === "arrowdown") {
      newDir = { x: 0, y: 1 };
    } else if (code === "KeyA" || key === "a" || key === "ф" || code === "ArrowLeft" || key === "arrowleft") {
      newDir = { x: -1, y: 0 };
    } else if (code === "KeyD" || key === "d" || key === "в" || code === "ArrowRight" || key === "arrowright") {
      newDir = { x: 1, y: 0 };
    }

    if (newDir) {
      e.preventDefault();
      if (!(newDir.x === -dir.x && newDir.y === -dir.y)) {
        manualKeyDir = newDir;
        nextDir = newDir;
        lastKeyboardTime = Date.now();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.key === " ") {
      isSpaceTurbo = false;
    }
  });

  window.addEventListener("blur", () => {
    isSpaceTurbo = false;
  });

  // Retro Arcade Apples / Data Cubes (strictly grid-aligned and avoiding UI cards)
  const FOOD_COUNT = 6;
  const foodList = [];
  const FOOD_COLORS = ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#ec4899", "#a855f7"];

  // Fast UI Obstacles Grid Cache (O(1) lookups, Zero DOM Thrashing)
  let uiBlockGrid = new Uint8Array(cols * rows);
  let lastUiCacheTime = 0;

  function updateUiObstacleCache(force = false) {
    const now = performance.now();
    if (!force && now - lastUiCacheTime < 350) return; // Refresh at most ~3 times per second
    lastUiCacheTime = now;

    uiBlockGrid.fill(0);
    const cards = document.querySelectorAll(".topic-card, .catalog-hero, .catalog-section-divider, .modal-card");

    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      if (el.closest('.modal-backdrop') && el.closest('.modal-backdrop').style.display === 'none') {
        continue;
      }
      const rect = el.getBoundingClientRect();
      const minGx = Math.max(0, Math.floor((rect.left - 4) / GRID_SIZE));
      const maxGx = Math.min(cols - 1, Math.floor((rect.right + 4) / GRID_SIZE));
      const minGy = Math.max(0, Math.floor((rect.top - 4) / GRID_SIZE));
      const maxGy = Math.min(rows - 1, Math.floor((rect.bottom + 4) / GRID_SIZE));

      for (let gy = minGy; gy <= maxGy; gy++) {
        const rowOffset = gy * cols;
        for (let gx = minGx; gx <= maxGx; gx++) {
          uiBlockGrid[rowOffset + gx] = 1;
        }
      }
    }
  }

  window.addEventListener("scroll", () => updateUiObstacleCache(true), { passive: true });
  window.addEventListener("resize", () => {
    uiBlockGrid = new Uint8Array(cols * rows);
    updateUiObstacleCache(true);
  }, { passive: true });
  updateUiObstacleCache(true);

  function isCellObstructedByUI(gx, gy) {
    // Змейка может свободно перемещаться по всему экрану под карточками и блоками
    return false;
  }

  // Calculate Side Gutter Bounds (left & right side zones outside main content)
  function getSideGutterBounds() {
    const mainContainer = document.getElementById("catalogHero") || document.getElementById("topicsGrid") || document.getElementById("catalogView");
    let leftMaxGx = Math.floor(cols * 0.18);
    let rightMinGx = Math.floor(cols * 0.82);

    if (mainContainer) {
      const rect = mainContainer.getBoundingClientRect();
      if (rect.width > 0) {
        const leftBoundaryGx = Math.max(1, Math.floor(rect.left / GRID_SIZE) - 1);
        const rightBoundaryGx = Math.min(cols - 2, Math.ceil(rect.right / GRID_SIZE) + 1);

        if (leftBoundaryGx >= 2) leftMaxGx = leftBoundaryGx;
        if (rightBoundaryGx <= cols - 3) rightMinGx = rightBoundaryGx;
      }
    }

    return {
      leftMinGx: 1,
      leftMaxGx: Math.max(2, leftMaxGx),
      rightMinGx: Math.min(cols - 3, rightMinGx),
      rightMaxGx: cols - 2
    };
  }

  function spawnFood(index) {
    const bounds = getSideGutterBounds();
    let gx, gy, collision;
    let attempts = 0;

    do {
      // Pick strictly left or right side gutter
      const isLeft = Math.random() < 0.5;
      if (isLeft) {
        gx = Math.floor(Math.random() * (bounds.leftMaxGx - bounds.leftMinGx + 1)) + bounds.leftMinGx;
      } else {
        gx = Math.floor(Math.random() * (bounds.rightMaxGx - bounds.rightMinGx + 1)) + bounds.rightMinGx;
      }
      gy = Math.floor(Math.random() * (rows - 4)) + 2;

      // Check collision with snake body or existing apples
      const hitsSnake = snake.some(seg => seg.gx === gx && seg.gy === gy);
      const hitsOtherFood = foodList.some(f => f.gx === gx && f.gy === gy);

      collision = hitsSnake || hitsOtherFood;
      attempts++;
    } while (collision && attempts < 60);

    return {
      gx,
      gy,
      color: FOOD_COLORS[index % FOOD_COLORS.length],
      scorePopup: 0
    };
  }

  for (let i = 0; i < FOOD_COUNT; i++) {
    foodList.push(spawnFood(i));
  }

  // Interactive Falling Apples Engine (Left Mouse Click Spawner)
  const fallingApples = [];
  const landingSparks = [];

  function dropNewApple(preferredGx = null) {
    const bounds = getSideGutterBounds();
    const isLeft = preferredGx !== null ? preferredGx < cols / 2 : Math.random() < 0.5;

    let targetGx;
    if (isLeft) {
      targetGx = Math.floor(Math.random() * (bounds.leftMaxGx - bounds.leftMinGx + 1)) + bounds.leftMinGx;
    } else {
      targetGx = Math.floor(Math.random() * (bounds.rightMaxGx - bounds.rightMinGx + 1)) + bounds.rightMinGx;
    }
    const targetGy = Math.floor(Math.random() * (rows - 6)) + 3;

    fallingApples.push({
      gx: targetGx,
      targetGy: targetGy,
      currentY: -GRID_SIZE * 3,
      vy: Math.random() * 1.5 + 2.2,
      gravity: 0.52,
      bounceCount: 0,
      color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
      alpha: 1
    });
  }

  // Interactive Falling Apples Engine (Left Mouse Click Spawner)
  function handleSpawnClick(e) {
    // Ignore clicks inside interactive UI components
    if (e.target.closest("button, a, input, textarea, select, .topic-card, .sidebar-item, .modal-card, .monaco-editor, .hero-sandbox-card, .snippet-runner-card, .ide-header, .terminal-top, .top-nav")) {
      return;
    }

    const clickGx = Math.max(1, Math.min(cols - 2, Math.floor(e.clientX / GRID_SIZE)));
    dropNewApple(clickGx);
  }

  // Mouse Listener: Left Click (button 0) drops apples, Middle Click (button 1) does nothing
  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      handleSpawnClick(e);
    }
  });

  // Right Click (button 2) Menu Suppression on page (Turbo boost only, no context menu)
  window.addEventListener("contextmenu", (e) => {
    if (e.target.closest("#monacoEditorContainer, input, textarea")) return;
    e.preventDefault();
  });

  // Ephemeral Turbo Sparks Particles
  const turboParticles = [];

  // Step Clock Timing for Authentic Arcade Snake Speed
  const STEP_INTERVAL_MS = 85; // ~11-12 grid moves per second
  let lastStepTime = performance.now();

  // Death & Glitch Particle Engine ("Python Kernel Panic")
  let gameState = "ALIVE"; // "ALIVE" | "DYING" | "RESPAWNING"
  let deathTimer = 0;
  let respawnAlpha = 1;
  const deathDebris = [];
  let shockwave = null;
  let errorToast = null;

  const PYTHON_EXCEPTIONS = [
    "RecursionError: maximum recursion depth exceeded",
    "IndexError: list index out of range",
    "ZeroDivisionError: division by zero",
    "KeyboardInterrupt: execution interrupted",
    "StopIteration: iterator exhausted",
    "TimeoutError: execution timed out",
    "MemoryError: out of memory",
    "SystemExit: exit code 1"
  ];

  function triggerDeath(headGx, headGy) {
    if (gameState !== "ALIVE") return;
    gameState = "DYING";
    deathTimer = performance.now();

    snakeCurrentScore = 0;
    updateSnakeScoreHUD();

    const hx = headGx * GRID_SIZE + GRID_SIZE / 2;
    const hy = headGy * GRID_SIZE + GRID_SIZE / 2;

    // 1. Shockwave Ring
    shockwave = {
      x: hx,
      y: hy,
      radius: 4,
      maxRadius: 120,
      alpha: 1
    };

    // 2. Python Error Badge
    const randomError = PYTHON_EXCEPTIONS[Math.floor(Math.random() * PYTHON_EXCEPTIONS.length)];
    errorToast = {
      text: randomError,
      x: Math.max(160, Math.min(width - 160, hx)),
      y: Math.max(50, Math.min(height - 50, hy - 24)),
      alpha: 1,
      glitchOffset: 0
    };

    // 3. Shatter snake segments into physics-driven cyber debris
    deathDebris.length = 0;
    const len = snake.length;

    snake.forEach((seg, i) => {
      const progress = 1 - i / len;
      const r = Math.round(255 * (1 - progress) + 56 * progress);
      const g = Math.round(107 * (1 - progress) + 189 * progress);
      const b = Math.round(0 * (1 - progress) + 248 * progress);
      const color = `rgb(${r}, ${g}, ${b})`;

      const segX = seg.gx * GRID_SIZE;
      const segY = seg.gy * GRID_SIZE;

      // Shatter each segment into 4 mini-pixels (Cinematic Slow-Mo Physics)
      for (let px = 0; px < 2; px++) {
        for (let py = 0; py < 2; py++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2.8 + 0.8;
          deathDebris.push({
            x: segX + px * (GRID_SIZE / 2),
            y: segY + py * (GRID_SIZE / 2),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2, // Gentle pop upwards
            size: GRID_SIZE / 2 - 1,
            color: color,
            alpha: 1,
            gravity: 0.06, // Soft cyber-gravity
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.08
          });
        }
      }
    });
  }

  function respawnSnake() {
    const spawnSide = Math.random() > 0.5 ? "right" : "left";
    const preferredGy = Math.floor(Math.random() * (rows - 6)) + 3;

    // Find a free Y-row near preferredGy unobstructed by UI on the spawn edge
    let chosenGy = preferredGy;
    let foundFree = false;
    const testGx = spawnSide === "right" ? cols - 2 : 1;

    for (let offset = 0; offset < rows / 2; offset++) {
      const gy1 = Math.max(1, Math.min(rows - 2, preferredGy + offset));
      const gy2 = Math.max(1, Math.min(rows - 2, preferredGy - offset));

      if (!isCellObstructedByUI(testGx, gy1)) {
        chosenGy = gy1;
        foundFree = true;
        break;
      }
      if (!isCellObstructedByUI(testGx, gy2)) {
        chosenGy = gy2;
        foundFree = true;
        break;
      }
    }

    if (!foundFree) {
      chosenGy = Math.floor(Math.random() * (rows - 4)) + 2;
    }

    snake = [];
    if (spawnSide === "left") {
      // Crawl in from left edge -> moving Right
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      for (let i = 0; i < INITIAL_LENGTH; i++) {
        snake.push({ gx: -i, gy: chosenGy });
      }
    } else {
      // Crawl in from right edge -> moving Left
      dir = { x: -1, y: 0 };
      nextDir = { x: -1, y: 0 };
      for (let i = 0; i < INITIAL_LENGTH; i++) {
        snake.push({ gx: cols - 1 + i, gy: chosenGy });
      }
    }

    gameState = "RESPAWNING";
    respawnAlpha = 1;
    deathDebris.length = 0;
    shockwave = null;
    errorToast = null;
  }

  // Initialize snake position via clean off-screen entry on startup
  respawnSnake();

  function getWrapDelta(from, to, max) {
    let diff = (to - from) % max;
    if (diff > max / 2) diff -= max;
    if (diff < -max / 2) diff += max;
    return diff;
  }

  function torusDistance(gx1, gy1, gx2, gy2) {
    const dx = Math.abs(getWrapDelta(gx1, gx2, cols));
    const dy = Math.abs(getWrapDelta(gy1, gy2, rows));
    return dx + dy;
  }

  function chooseNextDirection() {
    const head = snake[0];
    const now = Date.now();
    const isKeyboardActive = manualKeyDir && (now - lastKeyboardTime < 10000);

    const cardinalDirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    const possibleDirs = cardinalDirs.filter(d => !(d.x === -dir.x && d.y === -dir.y));

    // ==========================================
    // 1. KEYBOARD WASD / ARROWS CONTROL MODE
    // ==========================================
    if (isKeyboardActive) {
      if (!(manualKeyDir.x === -dir.x && manualKeyDir.y === -dir.y)) {
        return manualKeyDir;
      }
    }

    // ==========================================
    // 2. AUTOMATIC MODE (Smart BFS + Flood Fill)
    // ==========================================
    let target = null;
    let minDist = Infinity;
    foodList.forEach(food => {
      const d = torusDistance(head.gx, head.gy, food.gx, food.gy);
      if (d < minDist) {
        minDist = d;
        target = food;
      }
    });

    if (!target) {
      target = foodList[0] || { gx: 2, gy: 2 };
    }

    // BFS Pathfinding around UI obstacles & snake body
    const queue = [];
    const visited = new Set();
    const headKey = `${head.gx},${head.gy}`;
    visited.add(headKey);

    // Seed BFS queue with valid immediate moves
    for (const d of possibleDirs) {
      const nextGx = (head.gx + d.x + cols) % cols;
      const nextGy = (head.gy + d.y + rows) % rows;
      const hitsBody = snake.slice(0, -1).some(seg => seg.gx === nextGx && seg.gy === nextGy);
      const hitsUI = isCellObstructedByUI(nextGx, nextGy);

      if (!hitsBody && !hitsUI) {
        const key = `${nextGx},${nextGy}`;
        visited.add(key);
        queue.push({ gx: nextGx, gy: nextGy, firstDir: d, depth: 1 });
      }
    }

    if (queue.length === 0) {
      // Completely surrounded -> trigger death
      triggerDeath(head.gx, head.gy);
      return dir;
    }

    let bestBfsDir = null;
    const MAX_BFS_DEPTH = Math.max(120, cols + rows * 2);

    while (queue.length > 0) {
      const curr = queue.shift();

      if (curr.gx === target.gx && curr.gy === target.gy) {
        bestBfsDir = curr.firstDir;
        break;
      }

      if (curr.depth < MAX_BFS_DEPTH) {
        for (const d of cardinalDirs) {
          const nx = (curr.gx + d.x + cols) % cols;
          const ny = (curr.gy + d.y + rows) % rows;
          const key = `${nx},${ny}`;

          if (!visited.has(key)) {
            visited.add(key);
            const hitsBody = snake.slice(0, -1).some(seg => seg.gx === nx && seg.gy === ny);
            const hitsUI = isCellObstructedByUI(nx, ny);
            if (!hitsBody && !hitsUI) {
              queue.push({ gx: nx, gy: ny, firstDir: curr.firstDir, depth: curr.depth + 1 });
            }
          }
        }
      }
    }

    if (bestBfsDir) {
      return bestBfsDir;
    }

    // Fallback: Flood Fill count for largest open area
    let bestFallbackDir = null;
    let maxFreeSpace = -1;

    for (const d of possibleDirs) {
      const nextGx = (head.gx + d.x + cols) % cols;
      const nextGy = (head.gy + d.y + rows) % rows;
      const hitsBody = snake.slice(0, -1).some(seg => seg.gx === nextGx && seg.gy === nextGy);
      const hitsUI = isCellObstructedByUI(nextGx, nextGy);

      if (!hitsBody && !hitsUI) {
        let freeCount = 0;
        const ffQueue = [{ gx: nextGx, gy: nextGy, step: 0 }];
        const ffVisited = new Set([`${head.gx},${head.gy}`, `${nextGx},${nextGy}`]);

        while (ffQueue.length > 0 && freeCount < 30) {
          const cur = ffQueue.shift();
          freeCount++;
          if (cur.step < 8) {
            for (const cd of cardinalDirs) {
              const fx = (cur.gx + cd.x + cols) % cols;
              const fy = (cur.gy + cd.y + rows) % rows;
              const fk = `${fx},${fy}`;
              if (!ffVisited.has(fk)) {
                ffVisited.add(fk);
                if (!snake.slice(0, -1).some(s => s.gx === fx && s.gy === fy) && !isCellObstructedByUI(fx, fy)) {
                  ffQueue.push({ gx: fx, gy: fy, step: cur.step + 1 });
                }
              }
            }
          }
        }

        const dist = torusDistance(nextGx, nextGy, target.gx, target.gy);
        const score = freeCount * 10 - dist + (d.x === dir.x && d.y === dir.y ? 2 : 0);

        if (score > maxFreeSpace) {
          maxFreeSpace = score;
          bestFallbackDir = d;
        }
      }
    }

    return bestFallbackDir || dir;
  }

  function stepGame() {
    if (gameState !== "ALIVE" && gameState !== "RESPAWNING") return;

    nextDir = chooseNextDirection();
    if (gameState === "DYING") return;

    dir = nextDir;
    const head = snake[0];
    const newHead = {
      gx: (head.gx + dir.x + cols) % cols,
      gy: (head.gy + dir.y + rows) % rows
    };

    // Self-bite check
    const selfCollision = snake.slice(1).some(seg => seg.gx === newHead.gx && seg.gy === newHead.gy);
    if (selfCollision) {
      triggerDeath(newHead.gx, newHead.gy);
      return;
    }

    snake.unshift(newHead);

    if (gameState === "RESPAWNING") {
      respawnAlpha = Math.min(1, respawnAlpha + 0.1);
      if (respawnAlpha >= 1) {
        gameState = "ALIVE";
      }
    }

    // Food consumption & capped auto-respawn
    let ateFood = false;
    for (let idx = foodList.length - 1; idx >= 0; idx--) {
      const food = foodList[idx];
      if (food.gx === newHead.gx && food.gy === newHead.gy) {
        ateFood = true;
        snakeCurrentScore += 1;

        if (snakeCurrentScore > snakeHighScore) {
          snakeHighScore = snakeCurrentScore;
          try {
            localStorage.setItem(STORAGE_KEY_SNAKE_HIGHSCORE, String(snakeHighScore));
          } catch (e) {}
        }

        updateSnakeScoreHUD(true);

        const totalApples = foodList.length + fallingApples.length;

        // If total apples on screen exceed 10, stop auto-spawning replacements
        if (totalApples > 10) {
          foodList.splice(idx, 1);
        } else {
          foodList[idx] = spawnFood(idx);
        }
      }
    }

    if (!ateFood) {
      snake.pop();
    }
  }

  function render(time) {
    // Pause background simulation when tab is hidden or user is inside a topic workspace
    if (document.hidden || (workspaceView && workspaceView.classList.contains("active"))) {
      lastStepTime = performance.now();
      animationFrameId = requestAnimationFrame(render);
      return;
    }

    // Calculate dynamic step interval based on snake growth and spacebar turbo state
    const isTurbo = Boolean(isSpaceTurbo && snake.length > 0 && gameState === "ALIVE");

    // Base interval (115ms) smoothly scales down as snake grows (down to 65ms)
    const lengthBoost = Math.min(50, Math.max(0, snake.length - INITIAL_LENGTH) * 1.5);
    let currentInterval = Math.max(65, 115 - lengthBoost);

    // In Turbo Sprint mode (holding Space) accelerate by ~45%
    if (isTurbo) {
      currentInterval = Math.max(38, Math.round(currentInterval * 0.55));
    }

    // Step game logic on dynamic tick
    if (time - lastStepTime >= currentInterval) {
      stepGame();
      lastStepTime = time;
    }

    // Emit vivid turbo jet sparks from the snake's tail during sprint
    if (isTurbo && snake.length > 0) {
      const tail = snake[snake.length - 1];
      const prevTail = snake[snake.length - 2] || tail;

      // Vector pointing away from snake body out the back of the tail
      let tailDirX = getWrapDelta(prevTail.gx, tail.gx, cols);
      let tailDirY = getWrapDelta(prevTail.gy, tail.gy, rows);
      if (tailDirX === 0 && tailDirY === 0) {
        tailDirX = -dir.x;
        tailDirY = -dir.y;
      }

      const tx = tail.gx * GRID_SIZE + GRID_SIZE / 2;
      const ty = tail.gy * GRID_SIZE + GRID_SIZE / 2;
      const SPARK_PALETTE = ["#ff6b00", "#fbbf24", "#38bdf8", "#ffffff", "#f97316"];

      // Emit multiple trailing particles each frame out the back
      for (let s = 0; s < 3; s++) {
        const spread = (Math.random() - 0.5) * 2.2;
        const kickback = Math.random() * 3.5 + 1.2;
        turboParticles.push({
          x: tx + (Math.random() - 0.5) * 6,
          y: ty + (Math.random() - 0.5) * 6,
          vx: tailDirX * kickback + (-tailDirY * spread),
          vy: tailDirY * kickback + (tailDirX * spread),
          size: Math.random() * 2.5 + 2.5,
          color: SPARK_PALETTE[Math.floor(Math.random() * SPARK_PALETTE.length)],
          alpha: 1
        });
      }
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Subtle Retro Grid Dots
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    for (let x = 0; x < width; x += GRID_SIZE * 2) {
      for (let y = 0; y < height; y += GRID_SIZE * 2) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 2. Draw 8-Bit Food Apples
    ctx.save();
    foodList.forEach(food => {
      const fx = food.gx * GRID_SIZE;
      const fy = food.gy * GRID_SIZE;

      ctx.fillStyle = food.color;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(fx + 2, fy + 2, GRID_SIZE - 4, GRID_SIZE - 4);

      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(fx + 4, fy + 4, 3, 3);
    });

    // 2.1 Update & Draw Interactive Falling Apples
    for (let i = fallingApples.length - 1; i >= 0; i--) {
      const apple = fallingApples[i];
      apple.currentY += apple.vy;
      apple.vy += apple.gravity;

      const targetPxY = apple.targetGy * GRID_SIZE;
      const ax = apple.gx * GRID_SIZE;
      const ay = apple.currentY;

      // Draw falling apple glow & cube
      ctx.fillStyle = apple.color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ax + 2, ay + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ax + 4, ay + 4, 3, 3);

      // Trailing sparkles
      if (Math.random() > 0.4) {
        landingSparks.push({
          x: ax + GRID_SIZE / 2 + (Math.random() - 0.5) * 6,
          y: ay + GRID_SIZE / 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.5,
          color: apple.color,
          alpha: 0.8,
          size: 2
        });
      }

      // Check landing / bounce
      if (apple.currentY >= targetPxY) {
        apple.currentY = targetPxY;
        apple.bounceCount++;
        apple.vy = -apple.vy * 0.38; // Soft bounce

        // Emit landing particle burst
        for (let s = 0; s < 6; s++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = Math.random() * 2.5 + 0.8;
          landingSparks.push({
            x: ax + GRID_SIZE / 2,
            y: targetPxY + GRID_SIZE / 2,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 1,
            color: apple.color,
            alpha: 1,
            size: Math.random() > 0.5 ? 3 : 2
          });
        }

        if (apple.bounceCount >= 2 || Math.abs(apple.vy) < 0.6) {
          // Settle as active food on the grid
          foodList.push({
            gx: apple.gx,
            gy: apple.targetGy,
            color: apple.color,
            scorePopup: 15
          });
          fallingApples.splice(i, 1);
        }
      }
    }

    // 2.2 Update & Draw Landing Sparks
    for (let i = landingSparks.length - 1; i >= 0; i--) {
      const spk = landingSparks[i];
      spk.x += spk.vx;
      spk.y += spk.vy;
      spk.alpha -= 0.025;
      if (spk.alpha > 0) {
        ctx.fillStyle = spk.color;
        ctx.globalAlpha = spk.alpha;
        ctx.fillRect(spk.x, spk.y, spk.size, spk.size);
      } else {
        landingSparks.splice(i, 1);
      }
    }
    ctx.restore();

    // 3. Draw Snake Body Segments (when alive or respawning)
    if (gameState === "ALIVE" || gameState === "RESPAWNING") {
      ctx.save();
      const len = snake.length;
      const currentAlphaMultiplier = gameState === "RESPAWNING" ? respawnAlpha : 1;

      for (let i = len - 1; i >= 0; i--) {
        const seg = snake[i];
        const progress = 1 - i / len;

        const sx = seg.gx * GRID_SIZE;
        const sy = seg.gy * GRID_SIZE;

        const r = Math.round(255 * (1 - progress) + 56 * progress);
        const g = Math.round(107 * (1 - progress) + 189 * progress);
        const b = Math.round(0 * (1 - progress) + 248 * progress);
        const alpha = (0.35 + progress * 0.55) * currentAlphaMultiplier;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(sx + 1, sy + 1, GRID_SIZE - 2, GRID_SIZE - 2);

        ctx.strokeStyle = `rgba(7, 11, 16, ${0.65 * currentAlphaMultiplier})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 1, sy + 1, GRID_SIZE - 2, GRID_SIZE - 2);

        if (progress > 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * currentAlphaMultiplier})`;
          ctx.fillRect(sx + 3, sy + 3, 2, 2);
        }

        // Draw eyes on head
        if (i === 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlphaMultiplier})`;
          let eye1X, eye1Y, eye2X, eye2Y;

          if (dir.x === 1) {
            eye1X = sx + GRID_SIZE - 5; eye1Y = sy + 3;
            eye2X = sx + GRID_SIZE - 5; eye2Y = sy + GRID_SIZE - 6;
          } else if (dir.x === -1) {
            eye1X = sx + 2; eye1Y = sy + 3;
            eye2X = sx + 2; eye2Y = sy + GRID_SIZE - 6;
          } else if (dir.y === 1) {
            eye1X = sx + 3; eye1Y = sy + GRID_SIZE - 5;
            eye2X = sx + GRID_SIZE - 6; eye2Y = sy + GRID_SIZE - 5;
          } else {
            eye1X = sx + 3; eye1Y = sy + 2;
            eye2X = sx + GRID_SIZE - 6; eye2Y = sy + 2;
          }

          ctx.fillRect(eye1X, eye1Y, 3, 3);
          ctx.fillRect(eye2X, eye2Y, 3, 3);

          ctx.fillStyle = `rgba(7, 11, 16, ${currentAlphaMultiplier})`;
          ctx.fillRect(eye1X + (dir.x >= 0 ? 1 : 0), eye1Y + (dir.y >= 0 ? 1 : 0), 2, 2);
          ctx.fillRect(eye2X + (dir.x >= 0 ? 1 : 0), eye2Y + (dir.y >= 0 ? 1 : 0), 2, 2);
        }
      }
      ctx.restore();
    }

    // 4. Update & Draw Death Glitch Debris
    if (gameState === "DYING") {
      const elapsedDeath = performance.now() - deathTimer;

      ctx.save();
      for (let i = 0; i < deathDebris.length; i++) {
        const d = deathDebris[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += d.gravity;
        d.vx *= 0.99;
        d.rotation += d.rotSpeed;
        d.alpha -= 0.004;

        if (d.alpha > 0) {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rotation);
          ctx.fillStyle = d.color;
          ctx.globalAlpha = Math.max(0, d.alpha);
          ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          ctx.restore();
        }
      }
      ctx.restore();

      // Shockwave ring (gentle slow expansion)
      if (shockwave && shockwave.alpha > 0) {
        ctx.save();
        shockwave.radius += 1.8;
        shockwave.alpha -= 0.012;
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, shockwave.alpha)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Python Error Toast (Floating Glitch Chip - stays solid for 1.8s, then smoothly fades)
      if (errorToast && errorToast.alpha > 0) {
        ctx.save();
        if (elapsedDeath > 1800) {
          errorToast.alpha -= 0.012;
        }
        errorToast.y -= 0.12;
        errorToast.glitchOffset = (Math.random() - 0.5) * 1.5;

        const fullText = "⚠️ " + errorToast.text;
        ctx.font = '600 12px "JetBrains Mono", Consolas, monospace';
        const textWidth = ctx.measureText(fullText).width;
        const paddingX = 14;
        const boxW = textWidth + paddingX * 2;
        const boxH = 28;
        const bx = errorToast.x - boxW / 2 + errorToast.glitchOffset;
        const by = errorToast.y - boxH / 2;

        // Backdrop
        ctx.fillStyle = `rgba(15, 23, 42, ${0.92 * errorToast.alpha})`;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.9 * errorToast.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        // Icon & Text
        ctx.fillStyle = `rgba(239, 68, 68, ${errorToast.alpha})`;
        ctx.fillText(fullText, bx + paddingX, by + 18);
        ctx.restore();
      }

      // Trigger respawn after ~3.2s
      if (elapsedDeath > 3200) {
        respawnSnake();
      }
    }

    // 5. Update & Draw Ephemeral Turbo Sparks (luminous trailing jet)
    ctx.save();
    for (let i = turboParticles.length - 1; i >= 0; i--) {
      const p = turboParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha -= 0.028;

      if (p.alpha > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else {
        turboParticles.splice(i, 1);
      }
    }
    ctx.restore();

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);
}

