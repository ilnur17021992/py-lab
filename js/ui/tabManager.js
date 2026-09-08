// js/ui/tabManager.js - Editor tabs management with Drag & Drop reordering
import { state } from '../state.js';
import { getFileIcon } from './icons.js';

export class TabManager {
  constructor(tabsContainerEl) {
    this.tabsContainerEl = tabsContainerEl;
    this.draggedIndex = null;
    this.init();
  }

  init() {
    state.addEventListener('tabs-changed', () => this.render());
    state.addEventListener('active-file-changed', () => this.render());
    state.addEventListener('project-loaded', () => this.render());

    // Immediately render if project is already loaded in state
    if (state.currentProject) {
      this.render();
    }
  }

  render() {
    if (!this.tabsContainerEl) return;
    this.tabsContainerEl.innerHTML = '';

    const tabs = state.openTabs || [];
    const activeFile = state.activeFile;

    tabs.forEach((filePath, index) => {
      const fileName = filePath.split('/').filter(Boolean).pop() || filePath;
      const isActive = filePath === activeFile;

      const tabEl = document.createElement('div');
      tabEl.className = `editor-tab ${isActive ? 'active' : ''}`;
      tabEl.title = filePath;
      tabEl.draggable = true;
      tabEl.dataset.index = index;
      tabEl.dataset.path = filePath;

      tabEl.innerHTML = `
        <span class="tab-icon">${this.getFileIcon(fileName)}</span>
        <span class="tab-title">${this.escapeHtml(fileName)}</span>
        <button class="tab-close-btn" title="Закрыть вкладку">✕</button>
      `;

      tabEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close-btn')) {
          state.setActiveFile(filePath);
        }
      });

      tabEl.querySelector('.tab-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.closeTab(filePath);
      });

      // --- Drag & Drop Reordering Handlers ---
      tabEl.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        tabEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });

      tabEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (this.draggedIndex === null || this.draggedIndex === index) return;

        const rect = tabEl.getBoundingClientRect();
        const midPoint = rect.left + rect.width / 2;

        tabEl.classList.remove('drag-over-left', 'drag-over-right');
        if (e.clientX < midPoint) {
          tabEl.classList.add('drag-over-left');
        } else {
          tabEl.classList.add('drag-over-right');
        }
      });

      tabEl.addEventListener('dragleave', () => {
        tabEl.classList.remove('drag-over-left', 'drag-over-right');
      });

      tabEl.addEventListener('drop', (e) => {
        e.preventDefault();
        tabEl.classList.remove('drag-over-left', 'drag-over-right');

        if (this.draggedIndex === null || this.draggedIndex === index) return;

        const rect = tabEl.getBoundingClientRect();
        const midPoint = rect.left + rect.width / 2;
        let targetIndex = index;

        if (e.clientX >= midPoint && this.draggedIndex < index) {
          targetIndex = index;
        } else if (e.clientX < midPoint && this.draggedIndex > index) {
          targetIndex = index;
        } else if (e.clientX >= midPoint && this.draggedIndex > index) {
          targetIndex = index + 1;
        } else if (e.clientX < midPoint && this.draggedIndex < index) {
          targetIndex = Math.max(0, index - 1);
        }

        const fromIdx = this.draggedIndex;
        this.draggedIndex = null;
        state.reorderTabs(fromIdx, targetIndex);
      });

      tabEl.addEventListener('dragend', () => {
        this.draggedIndex = null;
        tabEl.classList.remove('dragging', 'drag-over-left', 'drag-over-right');
        document.querySelectorAll('.editor-tab').forEach(el => {
          el.classList.remove('drag-over-left', 'drag-over-right', 'dragging');
        });
      });

      this.tabsContainerEl.appendChild(tabEl);
    });
  }

  getFileIcon(fileName) {
    return getFileIcon(fileName, 14, this.escapeHtml(fileName));
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}
