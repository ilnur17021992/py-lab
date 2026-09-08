// js/ui/searchBar.js - Global Search across Folders, Files, and File Contents
import { state } from '../state.js';

export const DEFAULT_IDE_SEARCH_PLACEHOLDER = 'Поиск по файлам, папкам и коду...';

export class SearchBar {
  constructor(options = {}) {
    this.containerEl = document.getElementById('navSearchContainer');
    this.inputEl = document.getElementById('globalSearchInput');
    this.clearBtn = document.getElementById('clearSearchBtn');
    this.dropdownEl = document.getElementById('searchResultsDropdown');
    this.resultsListEl = document.getElementById('searchResultsList');
    this.countEl = document.getElementById('searchResultsCount');
    this.filterChips = document.querySelectorAll('.search-filter-chip');

    this.editor = options.editor || null;
    this.explorer = options.explorer || null;

    this.currentFilter = 'all';
    this.selectedIndex = -1;
    this.results = [];

    this.init();
  }

  init() {
    if (!this.inputEl) return;

    // Input events
    this.inputEl.addEventListener('input', () => this.handleInput());
    this.inputEl.addEventListener('focus', () => {
      if (this.inputEl.value.trim().length > 0) {
        this.showDropdown();
      }
    });

    // Keyboard navigation in search input
    this.inputEl.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Clear button
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.inputEl.value = '';
        this.inputEl.placeholder = DEFAULT_IDE_SEARCH_PLACEHOLDER;
        this.clearBtn.style.display = 'none';
        this.hideDropdown();
        this.inputEl.focus();
      });
    }

    // Filter chips
    this.filterChips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filterChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.getAttribute('data-filter') || 'all';
        this.performSearch();
      });
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.containerEl && !this.containerEl.contains(e.target)) {
        this.hideDropdown();
      }
    });

    // Global hotkey Ctrl+P / Cmd+P / Ctrl+Shift+F
    window.addEventListener('keydown', (e) => {
      const isP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З';
      const isF = e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А';
      if ((e.ctrlKey || e.metaKey) && (isP || (e.shiftKey && isF))) {
        e.preventDefault();
        this.inputEl.focus();
        this.inputEl.select();
        if (this.inputEl.value.trim().length > 0) {
          this.showDropdown();
        }
      }
    });
  }

  setEditor(editor) {
    this.editor = editor;
  }

  setExplorer(explorer) {
    this.explorer = explorer;
  }

  handleInput() {
    const val = this.inputEl.value;
    if (this.clearBtn) {
      this.clearBtn.style.display = val ? 'flex' : 'none';
    }

    if (!val.trim()) {
      this.hideDropdown();
      return;
    }

    this.performSearch();
    this.showDropdown();
  }

  handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.inputEl.value = '';
      this.inputEl.placeholder = DEFAULT_IDE_SEARCH_PLACEHOLDER;
      this.inputEl.blur();
      if (this.clearBtn) this.clearBtn.style.display = 'none';
      this.hideDropdown();
      if (this.editor && typeof this.editor.focus === 'function') {
        this.editor.focus();
      }
      return;
    }

    if (!this.dropdownEl || this.dropdownEl.style.display === 'none') {
      if (e.key === 'ArrowDown' && this.inputEl.value.trim()) {
        this.performSearch();
        this.showDropdown();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectPrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
        this.openResult(this.results[this.selectedIndex]);
      } else if (this.results.length > 0) {
        this.openResult(this.results[0]);
      }
    }
  }

  showDropdown() {
    if (this.dropdownEl) {
      this.dropdownEl.style.display = 'flex';
    }
  }

  hideDropdown() {
    if (this.dropdownEl) {
      this.dropdownEl.style.display = 'none';
    }
    this.selectedIndex = -1;
  }

  performSearch() {
    const query = this.inputEl.value.trim();
    if (!query || !state.currentProject) {
      this.results = [];
      this.renderResults();
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];
    const files = state.currentProject.files || {};
    const folders = state.currentProject.folders || [];

    // 1. Search Folders
    if (this.currentFilter === 'all' || this.currentFilter === 'folders') {
      folders.forEach((folderPath) => {
        const folderName = folderPath.split('/').filter(Boolean).pop() || folderPath;
        if (folderPath.toLowerCase().includes(lowerQuery) || folderName.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'folder',
            title: folderName,
            path: folderPath,
            icon: '📁',
            badge: 'Папка',
            matchType: 'folder'
          });
        }
      });
    }

    // 2. Search Files (by Name and Path)
    if (this.currentFilter === 'all' || this.currentFilter === 'files') {
      Object.keys(files).forEach((filePath) => {
        const fileName = filePath.split('/').filter(Boolean).pop() || filePath;
        if (filePath.toLowerCase().includes(lowerQuery) || fileName.toLowerCase().includes(lowerQuery)) {
          const ext = fileName.split('.').pop();
          const icon = ext === 'py' ? '🐍' : (ext === 'html' ? '🌐' : (ext === 'json' ? '📦' : '📄'));
          results.push({
            type: 'file',
            title: fileName,
            path: filePath,
            icon: icon,
            badge: 'Файл',
            matchType: 'file'
          });
        }
      });
    }

    // 3. Search File Contents
    if (this.currentFilter === 'all' || this.currentFilter === 'content') {
      Object.entries(files).forEach(([filePath, content]) => {
        if (typeof content !== 'string') return;
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes(lowerQuery)) {
            const fileName = filePath.split('/').filter(Boolean).pop() || filePath;
            results.push({
              type: 'content',
              title: `${fileName}:${idx + 1}`,
              path: filePath,
              lineNumber: idx + 1,
              column: lowerLine.indexOf(lowerQuery) + 1,
              lineContent: line.trim(),
              icon: '🔍',
              badge: `Стр. ${idx + 1}`,
              matchType: 'content'
            });
          }
        });
      });
    }

    this.results = results;
    this.selectedIndex = results.length > 0 ? 0 : -1;
    this.renderResults();
  }

  renderResults() {
    if (!this.resultsListEl) return;
    this.resultsListEl.innerHTML = '';

    if (this.countEl) {
      this.countEl.textContent = this.results.length ? `Найдено: ${this.results.length}` : '';
    }

    if (this.results.length === 0) {
      this.resultsListEl.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">🔎</div>
          <div>Ничего не найдено по запросу «${this.escapeHtml(this.inputEl.value)}»</div>
        </div>
      `;
      return;
    }

    const query = this.inputEl.value.trim();

    this.results.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = `search-result-item ${index === this.selectedIndex ? 'selected' : ''}`;

      let snippetHtml = '';
      if (item.type === 'content' && item.lineContent) {
        snippetHtml = `
          <div class="search-result-snippet">
            ${this.highlightMatch(item.lineContent, query)}
          </div>
        `;
      }

      itemEl.innerHTML = `
        <span class="search-result-icon">${item.icon}</span>
        <div class="search-result-info">
          <div class="search-result-title">
            <span>${this.highlightMatch(item.title, query)}</span>
            <span class="search-result-type-badge">${item.badge}</span>
          </div>
          <div class="search-result-path">${this.highlightMatch(item.path, query)}</div>
          ${snippetHtml}
        </div>
      `;

      itemEl.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelectedClass();
      });

      itemEl.addEventListener('click', () => {
        this.openResult(item);
      });

      this.resultsListEl.appendChild(itemEl);
    });

    this.scrollToSelected();
  }

  selectNext() {
    if (this.results.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    this.updateSelectedClass();
    this.scrollToSelected();
  }

  selectPrev() {
    if (this.results.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    this.updateSelectedClass();
    this.scrollToSelected();
  }

  updateSelectedClass() {
    const items = this.resultsListEl.querySelectorAll('.search-result-item');
    items.forEach((el, idx) => {
      if (idx === this.selectedIndex) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  scrollToSelected() {
    const selectedEl = this.resultsListEl.querySelector('.search-result-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  openResult(item) {
    this.hideDropdown();

    if (item.type === 'folder') {
      if (this.explorer && typeof this.explorer.revealFolder === 'function') {
        this.explorer.revealFolder(item.path);
      }
      return;
    }

    if (item.type === 'file' || item.type === 'content') {
      state.openTab(item.path);

      if (item.type === 'content' && item.lineNumber && this.editor) {
        setTimeout(() => {
          if (typeof this.editor.revealLineAndColumn === 'function') {
            this.editor.revealLineAndColumn(item.lineNumber, item.column || 1);
          } else if (typeof this.editor.highlightDebugLine === 'function') {
            this.editor.highlightDebugLine(item.lineNumber);
          }
        }, 80);
      } else if (this.editor) {
        setTimeout(() => this.editor.focus(), 50);
      }
    }
  }

  highlightMatch(text, query) {
    if (!text || !query) return this.escapeHtml(text || '');
    const escaped = this.escapeHtml(text);
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<span class="match-highlight">$1</span>');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
