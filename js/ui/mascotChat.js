/**
 * js/ui/mascotChat.js - AI Tutor Chat Drawer Controller for Snake Mascot
 * Streams responses from Cloudflare Worker using Qwen 2.5 / 3.8 model.
 */

export const CHAT_CONFIG = {
  workerUrl: 'https://crimson-glade-8f31.rahmatullin-ilnur-17021992.workers.dev/api/chat',
  model: 'qwen/qwen3.8-27b'
};

export const SUGGESTION_CHIPS = [
  {
    label: '💡 Объясни код',
    prompt: 'Объясни, как работает текущий код в моём редакторе и что делает каждая его ключевая часть.'
  },
  {
    label: '🐞 В чём ошибка?',
    prompt: 'Помоги найти и исправить ошибку в моём коде или терминале.'
  },
  {
    label: '🚀 Как улучшить код?',
    prompt: 'Как можно улучшить или оптимизировать этот Python код?'
  },
  {
    label: '✨ Дай совет',
    prompt: 'Дай полезный совет или трюк по Python в контексте текущей темы.'
  }
];

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render Markdown content (code blocks, inline code, bold, lists, paragraphs)
 */
export function renderMarkdown(text) {
  if (!text) return '';

  const codeBlocks = [];
  // 1. Normalize line breaks and extract fenced code blocks ```lang\ncode\n```
  const normalized = text.replace(/\r\n/g, '\n');
  let processed = normalized.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = (lang || 'python').toLowerCase().trim();
    const cleanCode = code.replace(/\r?\n$/, '');

    let highlighted = '';
    if (typeof window !== 'undefined' && window.Prism && window.Prism.languages && window.Prism.languages[language]) {
      try {
        highlighted = window.Prism.highlight(cleanCode, window.Prism.languages[language], language);
      } catch {
        highlighted = escapeHtml(cleanCode);
      }
    } else {
      highlighted = escapeHtml(cleanCode);
    }

    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const blockHtml = `
<div class="mascot-code-block">
  <div class="mascot-code-header">
    <span>${language}</span>
    <button class="mascot-code-copy-btn" type="button" data-code="${escapeHtml(cleanCode)}" title="Скопировать код">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Копировать
    </button>
  </div>
  <pre><code class="language-${language}">${highlighted}</code></pre>
</div>`;
    codeBlocks.push(blockHtml);
    return `\n\n${placeholder}\n\n`;
  });

  // 2. Escape remaining raw text
  processed = escapeHtml(processed);

  // 3. Inline code `code`
  processed = processed.replace(/`([^`]+)`/g, (match, code) => `<code>${code}</code>`);

  // 4. Bold **text**
  processed = processed.replace(/\*\*([^*]+)\*\*/g, (match, bold) => `<strong>${bold}</strong>`);

  // 5. Unordered lists (* or -)
  const lines = processed.split('\n');
  const outputLines = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^(\*|-)\s+(.*)$/);

    if (listMatch) {
      if (!inList) {
        outputLines.push('<ul>');
        inList = true;
      }
      outputLines.push(`<li>${listMatch[2]}</li>`);
    } else {
      if (inList) {
        outputLines.push('</ul>');
        inList = false;
      }
      outputLines.push(line);
    }
  }
  if (inList) {
    outputLines.push('</ul>');
  }
  processed = outputLines.join('\n');

  // 6. Paragraphs (split by double newlines)
  const paragraphs = processed.split(/\n\s*\n/);
  const formattedParagraphs = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('__CODE_BLOCK_') || trimmed.startsWith('<ul>') || trimmed.startsWith('<div')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  });

  processed = formattedParagraphs.filter(Boolean).join('');

  // 7. Restore code blocks using replacer function to avoid $1, $& replacement string interpretation
  codeBlocks.forEach((blockHtml, idx) => {
    processed = processed.replace(new RegExp(`__CODE_BLOCK_${idx}__`, 'g'), () => blockHtml);
  });

  return processed;
}

/**
 * Extract active topic, editor code, and terminal errors from DOM
 */
export function getEditorContext() {
  let topic = 'Python';
  let code = '';
  let error = '';

  if (typeof document !== 'undefined') {
    const catalogViewEl = document.getElementById('catalogView');
    const workspaceViewEl = document.getElementById('workspaceView');

    const isCatalogActive = Boolean(
      catalogViewEl &&
      (!workspaceViewEl || !workspaceViewEl.classList?.contains('active')) &&
      catalogViewEl.style?.display !== 'none'
    );

    if (isCatalogActive) {
      topic = 'Главная страница / Справочник';
      code = '';
      error = '';
      return { topic, code, error };
    }

    // Topic
    const topicEl = document.getElementById('topicTitleText') || document.getElementById('headerProjectName');
    if (topicEl && topicEl.textContent) {
      const text = topicEl.textContent.trim();
      if (text) topic = text;
    }

    // Code
    if (typeof window !== 'undefined') {
      if (typeof window.editor?.getValue === 'function') {
        code = window.editor.getValue();
      } else if (window.monaco?.editor?.getEditors?.()?.length > 0) {
        try {
          code = window.monaco.editor.getEditors()[0].getValue();
        } catch {
          // ignore
        }
      } else if (typeof window.app?.editor?.getContent === 'function') {
        code = window.app.editor.getContent();
      }
    }

    if (!code) {
      const codeEditorEl = document.getElementById('codeEditor') || document.querySelector('.monaco-editor');
      if (codeEditorEl) {
        code = codeEditorEl.value || '';
      }
    }

    // Terminal Error
    const termEl = document.getElementById('terminalOutput');
    if (termEl && termEl.textContent) {
      const text = termEl.textContent.trim();
      if (/Traceback|Error|Exception/i.test(text)) {
        error = text;
      }
    }

    // Safety limits for payload size
    if (code && code.length > 8000) {
      const lines = code.split('\n').slice(0, 300);
      code = lines.join('\n') + '\n# ... (код сокращен)';
    }

    if (error && error.length > 3000) {
      const lines = error.split('\n');
      error = lines.slice(-40).join('\n');
    }
  }

  return { topic, code, error };
}

/**
 * Build personalized system prompt for Snake
 */
export function buildSystemPrompt(context) {
  let prompt = `Ты Snake — дружелюбный, терпеливый и опытный AI-репетитор по Python на платформе Python Lab.
Твоя цель — помогать студенту понимать концепции Python, писать чистый код и находить ошибки.

Правила общения:
1. Отвечай кратко, понятно и доброжелательно на русском языке.
2. Используй живой тон, подбадривай студента (например, "Отличный вопрос!", "Давай разберёмся").
3. Код всегда форматируй в блоки с указанием языка: \`\`\`python ... \`\`\`.
4. Ключевые термины и функции выделяй **жирным** или \`моноширинным\` шрифтом.
5. Не вываливай гигантские простыни текста сразу — давай конкретные объяснения с небольшими наглядными примерами.
6. Никогда не повторяй приветствие или самопредставление ("Привет! Я Snake..."), если пользователь задал конкретный вопрос или диалог уже идёт. Сразу отвечай по существу!`;

  if (context.topic) {
    if (context.topic === 'Главная страница / Справочник') {
      prompt += `\n\nПользователь находится на главной странице (в каталоге / справочнике тем), никакой конкретный урок сейчас не открыт.`;
    } else {
      prompt += `\n\nТекущая тема занятия: "${context.topic}".`;
    }
  }
  if (context.code) {
    prompt += `\n\nКод студента в редакторе:\n\`\`\`python\n${context.code}\n\`\`\``;
  }
  if (context.error) {
    prompt += `\n\nПоследняя ошибка в терминале:\n\`\`\`\n${context.error}\n\`\`\``;
  }

  return prompt;
}

/**
 * Parse a single SSE line (e.g. data: {...} or data: [DONE])
 */
export function parseSSEChunk(line) {
  if (!line || !line.startsWith('data:')) {
    return { done: false, content: '' };
  }

  const payload = line.replace(/^data:\s*/, '').trim();
  if (payload === '[DONE]') {
    return { done: true, content: '' };
  }

  try {
    const json = JSON.parse(payload);
    const choice = json.choices?.[0];
    const content = choice?.delta?.content || '';
    const done = choice?.finish_reason === 'stop';
    return { done, content };
  } catch {
    return { done: false, content: '' };
  }
}

/**
 * MascotChat UI Controller
 */
export class MascotChat {
  constructor(options = {}) {
    this.workerUrl = options.workerUrl || CHAT_CONFIG.workerUrl;
    this.model = options.model || CHAT_CONFIG.model;
    this.history = []; // [{ role, content }]
    this.isOpenState = false;
    this.isGenerating = false;
    this.abortController = null;
    this.onStateChange = null;

    this.container = null;
    this.messagesContainer = null;
    this.inputField = null;
    this.sendBtn = null;
    this.customPos = null; // { x, y }
    this.isDragging = false;
    this.isResizing = false;
    this.lastUserText = '';
  }

  isCustomPositioned() {
    return Boolean(this.customPos);
  }

  setSize(width, height, options = {}) {
    if (!this.container) return;
    const vw = options.viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const vh = options.viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 768);
    const minW = options.minWidth || 320;
    const maxW = options.maxWidth || Math.max(minW, vw - 20);
    const minH = options.minHeight || 420;
    const maxH = options.maxHeight || Math.max(minH, vh - 40);

    const clampedW = Math.round(Math.min(Math.max(width, minW), maxW));
    const clampedH = Math.round(Math.min(Math.max(height, minH), maxH));

    this.container.style.width = `${clampedW}px`;
    this.container.style.height = `${clampedH}px`;

    if (options.left !== undefined) {
      const left = Math.round(options.left);
      this.container.style.left = `${left}px`;
      if (!this.customPos) this.customPos = {};
      this.customPos.x = left;
    }
    if (options.top !== undefined) {
      const top = Math.round(options.top);
      this.container.style.top = `${top}px`;
      if (!this.customPos) this.customPos = {};
      this.customPos.y = top;
    }

    return { width: clampedW, height: clampedH };
  }

  setPosition(x, y, options = {}) {
    if (!this.container) return;

    const vw = options.viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const vh = options.viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 768);
    const width = this.container.offsetWidth || 380;
    const height = this.container.offsetHeight || 520;
    const margin = 10;

    const minX = margin;
    const maxX = Math.max(margin, vw - width - margin);
    const minY = margin;
    const maxY = Math.max(margin, vh - height - margin);

    const clampedX = Math.round(Math.min(Math.max(x, minX), maxX));
    const clampedY = Math.round(Math.min(Math.max(y, minY), maxY));

    this.container.style.left = `${clampedX}px`;
    this.container.style.top = `${clampedY}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
    this.container.classList.add('floating-dragged');

    this.customPos = { x: clampedX, y: clampedY };
  }

  resetPosition() {
    if (!this.container) return;

    this.container.style.left = '';
    this.container.style.top = '';
    this.container.style.right = '';
    this.container.style.bottom = '';
    this.container.style.width = '';
    this.container.style.height = '';
    this.container.classList.remove('floating-dragged');
    this.customPos = null;
  }

  makeResizable(handleEl) {
    if (!handleEl || !this.container) return;

    let startPointerX = 0, startPointerY = 0;
    let startWidth = 0, startHeight = 0;
    let startLeft = 0, startTop = 0;
    let isFloating = false;

    const onPointerDown = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      this.isResizing = true;
      const rect = this.container.getBoundingClientRect();
      startPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      isFloating = this.isCustomPositioned();

      this.container.classList.add('is-resizing');

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!this.isResizing) return;
      if (e.cancelable && e.type.startsWith('touch')) {
        e.preventDefault();
      }

      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      // Top-Left resize: dragging left (negative dx) increases width
      // dragging up (negative dy) increases height
      const dx = clientX - startPointerX;
      const dy = clientY - startPointerY;

      const targetWidth = startWidth - dx;
      const targetHeight = startHeight - dy;

      if (isFloating) {
        const newLeft = startLeft + dx;
        const newTop = startTop + dy;
        this.setSize(targetWidth, targetHeight, { left: newLeft, top: newTop });
      } else {
        // Docked at bottom-right: changing width/height naturally expands top-left
        this.setSize(targetWidth, targetHeight);
      }
    };

    const onPointerUp = () => {
      if (!this.isResizing) return;
      this.isResizing = false;
      this.container.classList.remove('is-resizing');

      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    };

    handleEl.addEventListener('mousedown', onPointerDown);
    handleEl.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  makeDraggable(headerEl) {
    if (!headerEl || !this.container) return;

    let startPointerX = 0;
    let startPointerY = 0;
    let initialContainerX = 0;
    let initialContainerY = 0;

    const onPointerDown = (e) => {
      // Don't drag if clicking buttons or actions
      if (e.target.closest('button') || e.target.closest('.mascot-chat-actions')) {
        return;
      }

      this.isDragging = true;
      const rect = this.container.getBoundingClientRect();
      startPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      initialContainerX = rect.left;
      initialContainerY = rect.top;

      this.container.classList.add('is-dragging');
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      if (e.cancelable && e.type.startsWith('touch')) {
        e.preventDefault();
      }

      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = clientX - startPointerX;
      const dy = clientY - startPointerY;

      this.setPosition(initialContainerX + dx, initialContainerY + dy);
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.container.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    };

    headerEl.addEventListener('mousedown', onPointerDown);
    headerEl.addEventListener('touchstart', onPointerDown, { passive: true });
  }

  isOpen() {
    return this.isOpenState;
  }

  notifyState(state) {
    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(state);
      } catch (err) {
        console.error('MascotChat onStateChange error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('mascot-chat-state', { detail: { state } }));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Lazily inject DOM elements if not already in document
   */
  ensureDOM() {
    if (typeof document === 'undefined') return;

    if (this.container && document.body.contains(this.container)) {
      return;
    }

    let existing = document.getElementById('mascotChatWindow');
    if (existing) {
      this.container = existing;
      this.bindElements();
      return;
    }

    const windowEl = document.createElement('div');
    windowEl.id = 'mascotChatWindow';
    windowEl.className = 'mascot-chat-window hidden';

    windowEl.innerHTML = `
      <div class="mascot-chat-resize-handle top-left" id="mascotChatResizeHandle" title="Потяните для изменения размера">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 10L10 2M2 6L6 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="mascot-chat-header" id="mascotChatHeader" title="Потяните за заголовок для перемещения окна">
        <div class="mascot-chat-header-profile">
          <div class="mascot-chat-avatar">
            <img src="favicon.svg" class="mascot-chat-avatar-img" alt="Snake Avatar">
            <span class="mascot-chat-avatar-badge" title="В сети"></span>
          </div>
          <div class="mascot-chat-header-info">
            <div class="mascot-chat-title-row">
              <span class="mascot-chat-title">Snake AI Репетитор</span>
              <span class="mascot-chat-status-badge">Онлайн</span>
            </div>
            <span class="mascot-chat-subtitle">Твой персональный помощник по Python</span>
          </div>
        </div>
        <div class="mascot-chat-actions">
          <button class="mascot-chat-btn" id="mascotChatResetPosBtn" type="button" title="Вернуть окно на место" aria-label="Вернуть на место">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <polyline points="3 3 3 8 8 8"></polyline>
            </svg>
          </button>
          <button class="mascot-chat-btn" id="mascotChatClearBtn" type="button" title="Очистить историю чата">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="mascot-chat-btn" id="mascotChatCloseBtn" type="button" title="Закрыть">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="mascot-chat-messages" id="mascotChatMessages">
        <div class="mascot-chat-empty" id="mascotChatEmpty">
          <div class="mascot-chat-empty-icon">🎓</div>
          <div class="mascot-chat-empty-title">Привет! Я Snake!</div>
          <div class="mascot-chat-empty-desc">
            Твой личный AI-репетитор по Python. Задай вопрос, попроси объяснить код или разобрать ошибку.
          </div>
        </div>
      </div>

      <div class="mascot-chat-chips" id="mascotChatChips">
        ${SUGGESTION_CHIPS.map(chip => `
          <button class="mascot-chip" type="button" data-prompt="${escapeHtml(chip.prompt)}">
            ${escapeHtml(chip.label)}
          </button>
        `).join('')}
      </div>

      <div class="mascot-chat-input-bar">
        <div class="mascot-chat-input-wrapper">
          <textarea
            class="mascot-chat-textarea"
            id="mascotChatInput"
            placeholder="Спроси Snake о коде или теме..."
            rows="1"
          ></textarea>
        </div>
        <button class="mascot-chat-send-btn" id="mascotChatSendBtn" type="button" aria-label="Отправить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(windowEl);
    this.container = windowEl;
    this.bindElements();
  }

  bindElements() {
    if (!this.container) return;

    this.messagesContainer = this.container.querySelector('#mascotChatMessages');
    this.inputField = this.container.querySelector('#mascotChatInput');
    this.sendBtn = this.container.querySelector('#mascotChatSendBtn');
    const closeBtn = this.container.querySelector('#mascotChatCloseBtn');
    const clearBtn = this.container.querySelector('#mascotChatClearBtn');
    const resetPosBtn = this.container.querySelector('#mascotChatResetPosBtn');
    const headerEl = this.container.querySelector('#mascotChatHeader');
    const resizeHandle = this.container.querySelector('#mascotChatResizeHandle');
    const chipsContainer = this.container.querySelector('#mascotChatChips');

    // Make window resizable via top-left handle
    if (resizeHandle) {
      this.makeResizable(resizeHandle);
    }

    // Make window draggable via header
    if (headerEl) {
      this.makeDraggable(headerEl);
    }

    // Reset position button
    resetPosBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetPosition();
    });

    // Close button
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Clear chat button
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clear();
    });

    // Send button: sends message or stops current streaming generation
    this.sendBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isGenerating) {
        this.stopGeneration();
      } else {
        this.handleSend();
      }
    });

    // Textarea input auto-grow and Enter handling
    if (this.inputField) {
      if (!this.inputField.value || this.inputField.value === 'null') {
        this.inputField.value = '';
      }

      this.resizeInputField();

      this.inputField.addEventListener('input', () => {
        this.resizeInputField();
      });

      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    // Chips click
    chipsContainer?.addEventListener('click', (e) => {
      const chip = e.target.closest('.mascot-chip');
      if (chip && chip.dataset.prompt) {
        this.sendMessage(chip.dataset.prompt);
      }
    });

    // Delegated actions inside messages container (code copy & error retry)
    this.messagesContainer?.addEventListener('click', async (e) => {
      // Retry button click
      const retryBtn = e.target.closest('.mascot-retry-btn');
      if (retryBtn) {
        this.retryLast();
        return;
      }

      // Code copy button click
      const copyBtn = e.target.closest('.mascot-code-copy-btn');
      if (!copyBtn) return;

      const code = copyBtn.dataset.code;
      if (!code) return;

      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(code);
        } else {
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }

        const origHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Скопировано!
        `;
        copyBtn.style.color = '#22c55e';
        setTimeout(() => {
          copyBtn.innerHTML = origHtml;
          copyBtn.style.color = '';
        }, 1800);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    });
  }

  open() {
    this.ensureDOM();
    if (!this.container) return;

    if (this.inputField && (!this.inputField.value || this.inputField.value === 'null')) {
      this.inputField.value = '';
    }

    this.container.classList.remove('hidden', 'animating-out');
    this.isOpenState = true;
    this.notifyState('open');

    setTimeout(() => {
      this.inputField?.focus();
      this.scrollToBottom();
    }, 50);
  }

  close() {
    if (!this.container || !this.isOpenState) return;

    this.container.classList.add('animating-out');
    setTimeout(() => {
      if (this.container && !this.isOpenState) {
        this.container.classList.add('hidden');
      }
    }, 200);

    this.isOpenState = false;
    this.notifyState('close');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  clear() {
    this.history = [];
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = `
        <div class="mascot-chat-empty" id="mascotChatEmpty">
          <div class="mascot-chat-empty-icon">🎓</div>
          <div class="mascot-chat-empty-title">Чат очищен</div>
          <div class="mascot-chat-empty-desc">
            Чем я могу помочь тебе сейчас? Задай любой вопрос по коду или выбери подсказку ниже!
          </div>
        </div>
      `;
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  resizeInputField() {
    if (!this.inputField) return;
    this.inputField.style.height = 'auto';
    const scrollH = this.inputField.scrollHeight || 0;
    const maxHeight = 110;
    const targetH = Math.min(scrollH, maxHeight);
    this.inputField.style.height = targetH > 0 ? `${targetH}px` : 'auto';
    this.inputField.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }

  handleSend() {
    if (!this.inputField) return;
    const text = (this.inputField.value || '').trim();
    if (!text || text === 'null' || this.isGenerating) return;

    this.inputField.value = '';
    this.resizeInputField();
    this.sendMessage(text);
  }

  appendMessageBubble(role, content = '', isStreaming = false) {
    this.ensureDOM();
    if (!this.messagesContainer) return null;

    const empty = this.messagesContainer.querySelector('#mascotChatEmpty');
    if (empty) {
      empty.remove();
    }

    const msgEl = document.createElement('div');
    msgEl.className = `mascot-msg ${role}`;

    if (role === 'assistant') {
      msgEl.innerHTML = `<div class="mascot-msg-avatar">🐍</div><div class="mascot-msg-bubble"><div class="mascot-msg-content">${content ? renderMarkdown(content) : ''}${isStreaming ? '<span class="mascot-typing-indicator"><span class="mascot-typing-dot"></span><span class="mascot-typing-dot"></span><span class="mascot-typing-dot"></span></span>' : ''}</div></div>`;
    } else {
      msgEl.innerHTML = `<div class="mascot-msg-bubble"><div class="mascot-msg-content">${renderMarkdown(content)}</div></div>`;
    }

    this.messagesContainer.appendChild(msgEl);
    this.scrollToBottom();
    return msgEl;
  }

  setGenerating(isGenerating) {
    this.isGenerating = Boolean(isGenerating);
    if (!this.sendBtn) return;

    if (this.isGenerating) {
      this.sendBtn.classList.add('is-stopping');
      this.sendBtn.title = 'Остановить ответ';
      this.sendBtn.setAttribute('aria-label', 'Остановить');
      this.sendBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <rect x="6" y="6" width="12" height="12" rx="2"></rect>
        </svg>
      `;
      this.sendBtn.disabled = false;
    } else {
      this.sendBtn.classList.remove('is-stopping');
      this.sendBtn.title = 'Отправить';
      this.sendBtn.setAttribute('aria-label', 'Отправить');
      this.sendBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      this.sendBtn.disabled = false;
    }
  }

  async sendMessage(userText) {
    if (!userText || this.isGenerating) return;

    this.lastUserText = userText;
    this.open();
    this.appendMessageBubble('user', userText);
    this.history.push({ role: 'user', content: userText });

    const assistantMsgEl = this.appendMessageBubble('assistant', '', true);
    const contentEl = assistantMsgEl?.querySelector('.mascot-msg-content');

    this.setGenerating(true);
    this.notifyState('typing');

    this.abortController = new AbortController();

    const context = getEditorContext();
    const systemPrompt = buildSystemPrompt(context);

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...this.history
    ];

    let fullReply = '';

    try {
      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          message: userText,
          context: context,
          history: this.history.slice(0, -1),
          messages: apiMessages,
          stream: true
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = parseSSEChunk(trimmed);
          if (parsed.content) {
            fullReply += parsed.content;
            if (contentEl) {
              contentEl.innerHTML = `${renderMarkdown(fullReply)}<span class="mascot-streaming-cursor"></span>`;
              this.scrollToBottom();
            }
          }
          if (parsed.done) {
            break;
          }
        }
      }

      if (contentEl) {
        contentEl.innerHTML = renderMarkdown(fullReply);
      }
      this.history.push({ role: 'assistant', content: fullReply });
      this.notifyState('done');
    } catch (err) {
      if (err.name === 'AbortError') {
        if (contentEl) {
          contentEl.innerHTML = `${renderMarkdown(fullReply)}<br><small style="color:#94a3b8;">(Остановлено пользователем)</small>`;
        }
        if (fullReply) {
          this.history.push({ role: 'assistant', content: fullReply });
        } else {
          this.history.pop();
        }
      } else {
        console.error('MascotChat generation error:', err);
        // Remove unanswered message from history to prevent duplication on retry
        this.history.pop();
        if (contentEl) {
          contentEl.innerHTML = `
            <div style="color: #ef4444; margin-bottom: 6px;">
              ⚠️ Не удалось получить ответ: ${escapeHtml(err.message)}
            </div>
            <button class="mascot-chip mascot-retry-btn" type="button" style="border-color:#ef4444;">
              🔄 Попробовать снова
            </button>
          `;
        }
        this.notifyState('error');
      }
    } finally {
      this.setGenerating(false);
      this.abortController = null;
      this.scrollToBottom();
    }
  }

  retryLast() {
    if (this.lastUserText) {
      this.sendMessage(this.lastUserText);
    } else {
      const lastUserMsg = [...this.history].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        this.sendMessage(lastUserMsg.content);
      }
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

// Singleton instance
export const mascotChat = new MascotChat();

if (typeof window !== 'undefined') {
  window.mascotChat = mascotChat;
}
