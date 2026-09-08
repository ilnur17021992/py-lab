// js/ui/terminal.js - Terminal output and formatting UI
export class TerminalUI {
  constructor(containerEl, outputEl) {
    this.containerEl = containerEl;
    this.outputEl = outputEl;
    this.statusBadge = document.getElementById('workerStatusBadge');
    this.statusLabel = document.getElementById('workerStatusLabel');
    this.clearBtn = document.getElementById('clearTerminalBtn');

    this.init();
  }

  init() {
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clear());
    }
  }

  appendLine(text, type = 'stdout') {
    if (!this.outputEl) return;

    const span = document.createElement('span');
    span.className = `term-line-${type}`;
    span.textContent = text;

    this.outputEl.appendChild(span);
    this.scrollToBottom();
  }

  appendStdout(text) {
    this.appendLine(text, 'stdout');
  }

  appendStderr(text) {
    this.appendLine(text, 'stderr');
  }

  appendSystem(text) {
    this.appendLine(text, 'system');
  }

  clear() {
    if (this.outputEl) {
      this.outputEl.innerHTML = '';
    }
  }

  scrollToBottom() {
    if (this.containerEl) {
      this.containerEl.scrollTop = this.containerEl.scrollHeight;
    }
  }

  updateStatus(status, message) {
    if (!this.statusBadge || !this.statusLabel) return;

    this.statusBadge.className = `worker-status-badge status-${status}`;
    this.statusLabel.textContent = message || (status === 'ready' ? 'Готов к запуску' : status);
  }
}
