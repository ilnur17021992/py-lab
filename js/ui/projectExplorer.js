// js/ui/projectExplorer.js - File & Folder Explorer tree with nesting and in-app styled dialogs
import { state } from '../state.js';
import { getFileIcon } from './icons.js';
import { showConfirmModal, showAlertModal, showPromptModal } from '../utils/modalDialog.js';

export class ProjectExplorer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.collapsedFolders = new Set();
    this.init();
  }

  init() {
    state.addEventListener('project-loaded', () => this.render());
    state.addEventListener('file-created', () => this.render());
    state.addEventListener('file-deleted', () => this.render());
    state.addEventListener('file-renamed', () => this.render());
    state.addEventListener('folder-created', () => this.render());
    state.addEventListener('folder-deleted', () => this.render());
    state.addEventListener('folder-renamed', () => this.render());
    state.addEventListener('item-moved', () => this.render());
    state.addEventListener('files-imported', () => this.render());
    state.addEventListener('active-file-changed', () => this.updateActiveHighlight());

    const newFileBtn = document.getElementById('newFileBtn');
    const newFolderBtn = document.getElementById('newFolderBtn');

    if (newFileBtn) {
      newFileBtn.addEventListener('click', () => this.showNewFileDialog());
    }

    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', () => this.showNewFolderDialog());
    }

    this.setupProjectSectionToggle();
    this.setupRootDropZone();

    if (state.currentProject) {
      this.render();
    }
  }

  setupProjectSectionToggle() {
    const sectionHeader = document.querySelector('.sidebar-section-header');
    const toggleTarget = document.querySelector('.section-header-left');
    const STORAGE_KEY_SECTION_COLLAPSED = 'learn_py_ide_project_section_collapsed';

    if (!sectionHeader || !toggleTarget) return;

    const setSectionCollapsed = (collapsed) => {
      if (collapsed) {
        sectionHeader.classList.add('collapsed');
        if (this.containerEl) this.containerEl.classList.add('collapsed');
        try {
          localStorage.setItem(STORAGE_KEY_SECTION_COLLAPSED, 'true');
        } catch (e) {}
      } else {
        sectionHeader.classList.remove('collapsed');
        if (this.containerEl) this.containerEl.classList.remove('collapsed');
        try {
          localStorage.setItem(STORAGE_KEY_SECTION_COLLAPSED, 'false');
        } catch (e) {}
      }
    };

    // Restore saved collapsed state
    try {
      if (localStorage.getItem(STORAGE_KEY_SECTION_COLLAPSED) === 'true') {
        setSectionCollapsed(true);
      }
    } catch (e) {}

    toggleTarget.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = sectionHeader.classList.contains('collapsed');
      setSectionCollapsed(!isCollapsed);
    });
  }

  setupRootDropZone() {
    if (!this.containerEl) return;

    // Drop zone for root tree container
    this.containerEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!e.target.closest('.tree-folder-item')) {
        this.containerEl.classList.add('drag-target-root');
      }
    });

    this.containerEl.addEventListener('dragleave', (e) => {
      if (!this.containerEl.contains(e.relatedTarget)) {
        this.containerEl.classList.remove('drag-target-root');
      }
    });

    this.containerEl.addEventListener('drop', async (e) => {
      if (e.target.closest('.tree-folder-item')) return; // Handled by folder item

      e.preventDefault();
      this.clearAllDropHighlights();

      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          if (data && data.path) {
            state.moveItem(data.path, '');
          }
        } catch (err) {
          this.showAlertDialog('Перемещение', err.message || 'Ошибка перемещения');
        }
      } else if ((e.dataTransfer.items && e.dataTransfer.items.length > 0) || (e.dataTransfer.files && e.dataTransfer.files.length > 0)) {
        await this.handleExternalDrop(e.dataTransfer, '');
      }
    });

    // Also support dropping into Project Header to move to root
    const projectHeader = document.querySelector('.sidebar-section-header');
    if (projectHeader) {
      projectHeader.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.containerEl.classList.add('drag-target-root');
      });

      projectHeader.addEventListener('dragleave', () => {
        this.containerEl.classList.remove('drag-target-root');
      });

      projectHeader.addEventListener('drop', async (e) => {
        e.preventDefault();
        this.clearAllDropHighlights();
        const rawData = e.dataTransfer.getData('application/json');
        if (rawData) {
          try {
            const data = JSON.parse(rawData);
            if (data && data.path) {
              state.moveItem(data.path, '');
            }
          } catch (err) {
            this.showAlertDialog('Перемещение', err.message || 'Ошибка перемещения');
          }
        } else if ((e.dataTransfer.items && e.dataTransfer.items.length > 0) || (e.dataTransfer.files && e.dataTransfer.files.length > 0)) {
          await this.handleExternalDrop(e.dataTransfer, '');
        }
      });
    }
  }

  async handleExternalDrop(dataTransfer, targetFolderPath = '') {
    const items = dataTransfer.items;
    const filesMap = {};
    const foldersList = [];

    const readFileEntry = (fileEntry) => {
      return new Promise((resolve) => {
        fileEntry.file((file) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = () => resolve('');
          reader.readAsText(file);
        }, () => resolve(''));
      });
    };

    const readDirectoryEntry = async (dirEntry, parentPath) => {
      const currentFolderPath = parentPath
        ? `${parentPath}/${dirEntry.name}`
        : (targetFolderPath ? `${targetFolderPath}/${dirEntry.name}` : `/${dirEntry.name}`);
      foldersList.push(currentFolderPath);

      const reader = dirEntry.createReader();
      const readAllEntries = () => {
        return new Promise((resolve) => {
          const allEntries = [];
          const readBatch = () => {
            reader.readEntries((entries) => {
              if (!entries || entries.length === 0) {
                resolve(allEntries);
              } else {
                allEntries.push(...entries);
                readBatch();
              }
            }, () => resolve(allEntries));
          };
          readBatch();
        });
      };

      const entries = await readAllEntries();
      for (const entry of entries) {
        if (entry.isFile) {
          const content = await readFileEntry(entry);
          const filePath = `${currentFolderPath}/${entry.name}`;
          filesMap[filePath] = content;
        } else if (entry.isDirectory) {
          await readDirectoryEntry(entry, currentFolderPath);
        }
      }
    };

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          if (entry.isFile) {
            const content = await readFileEntry(entry);
            const filePath = targetFolderPath ? `${targetFolderPath}/${entry.name}` : `/${entry.name}`;
            filesMap[filePath] = content;
          } else if (entry.isDirectory) {
            await readDirectoryEntry(entry, targetFolderPath);
          }
        } else {
          const file = item.getAsFile ? item.getAsFile() : null;
          if (file) {
            const content = await file.text();
            const filePath = targetFolderPath ? `${targetFolderPath}/${file.name}` : `/${file.name}`;
            filesMap[filePath] = content;
          }
        }
      }
    } else if (dataTransfer.files && dataTransfer.files.length > 0) {
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i];
        const content = await file.text();
        const filePath = targetFolderPath ? `${targetFolderPath}/${file.name}` : `/${file.name}`;
        filesMap[filePath] = content;
      }
    }

    if (Object.keys(filesMap).length > 0 || foldersList.length > 0) {
      state.importFiles(filesMap, foldersList);
    }
  }

  buildTreeData() {
    const root = { name: '', path: '', isFolder: true, children: {} };

    // 1. Add explicitly created folders
    const explicitFolders = state.currentProject.folders || [];
    explicitFolders.forEach(folderPath => {
      const parts = folderPath.split('/').filter(Boolean);
      let current = root;
      let currPath = '';
      for (const part of parts) {
        currPath += '/' + part;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currPath,
            isFolder: true,
            children: {}
          };
        }
        current = current.children[part];
      }
    });

    // 2. Add files (and their implicit parent folders)
    const files = Object.keys(state.currentProject.files || {});
    files.forEach(filePath => {
      const parts = filePath.split('/').filter(Boolean);
      const fileName = parts.pop();
      let current = root;
      let currPath = '';

      for (const part of parts) {
        currPath += '/' + part;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currPath,
            isFolder: true,
            children: {}
          };
        }
        current = current.children[part];
      }

      if (fileName) {
        current.children[fileName] = {
          name: fileName,
          path: filePath,
          isFolder: false
        };
      }
    });

    return root;
  }

  render() {
    if (!this.containerEl || !state.currentProject) return;
    this.containerEl.innerHTML = '';

    const root = this.buildTreeData();
    this.renderNodeChildren(root, this.containerEl, 0);
  }

  renderNodeChildren(parentNode, container, level) {
    const sortedKeys = Object.keys(parentNode.children).sort((a, b) => {
      const nodeA = parentNode.children[a];
      const nodeB = parentNode.children[b];
      // Folders first, then files
      if (nodeA.isFolder && !nodeB.isFolder) return -1;
      if (!nodeA.isFolder && nodeB.isFolder) return 1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      const node = parentNode.children[key];
      if (node.isFolder) {
        this.renderFolderItem(node, container, level);
      } else {
        this.renderFileItem(node, container, level);
      }
    });
  }

  renderFolderItem(folderNode, container, level) {
    const isCollapsed = this.collapsedFolders.has(folderNode.path);
    const folderEl = document.createElement('div');
    folderEl.className = 'tree-item tree-folder-item';
    folderEl.style.paddingLeft = `${12 + level * 14}px`;
    folderEl.dataset.path = folderNode.path;
    folderEl.draggable = true;

    folderEl.innerHTML = `
      <div class="tree-item-name">
        <span class="tree-arrow-icon">${isCollapsed ? '▶' : '▼'}</span>
        <span class="tree-item-icon">${isCollapsed ? '📁' : '📂'}</span>
        <span class="tree-label">${this.escapeHtml(folderNode.name)}</span>
      </div>
      <div class="tree-item-actions">
        <button class="tree-action-btn add-file-inside-btn" title="Создать файл в папке">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M9 1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6l-5-5zm4 12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4v4h4v7z"/>
            <path d="M8 8a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V12.5a.5.5 0 0 1-1 0V11H6a.5.5 0 0 1 0-1h1.5V8.5A.5.5 0 0 1 8 8z"/>
          </svg>
        </button>
        <button class="tree-action-btn add-folder-inside-btn" title="Создать подпапку">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.293a1.5 1.5 0 0 1 1.06.44L8.293 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/>
            <path d="M7.5 7.5a.5.5 0 0 1 .5.5v1.5H9.5a.5.5 0 0 1 0 1H8V12a.5.5 0 0 1-1 0v-1.5H5.5a.5.5 0 0 1 0-1H7V8a.5.5 0 0 1 .5-.5z"/>
          </svg>
        </button>
        <button class="tree-action-btn rename-btn" title="Переименовать папку">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M12.146.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-4 1a.5.5 0 0 1-.65-.65l1-4a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.806 3.224 3.224-.806a.5.5 0 0 1 .123-.057l-2.484-2.484a.5.5 0 0 1-.057.123z"/>
          </svg>
        </button>
        <button class="tree-action-btn delete-file-btn" title="Удалить папку">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    `;

    // Drag events for folder
    folderEl.addEventListener('dragstart', (e) => {
      if (document.body.classList.contains('resizing-active')) {
        e.preventDefault();
        return;
      }
      const rect = folderEl.getBoundingClientRect();
      if (e.clientX > rect.right - 14) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      folderEl.classList.add('dragging');
      e.dataTransfer.setData('application/json', JSON.stringify({
        path: folderNode.path,
        isFolder: true
      }));
      e.dataTransfer.effectAllowed = 'move';
    });

    folderEl.addEventListener('dragend', () => {
      folderEl.classList.remove('dragging');
      this.clearAllDropHighlights();
    });

    // Drop target events for folder
    folderEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      this.clearAllDropHighlights();
      folderEl.classList.add('drag-target-folder');
    });

    folderEl.addEventListener('dragleave', (e) => {
      if (!folderEl.contains(e.relatedTarget)) {
        folderEl.classList.remove('drag-target-folder');
      }
    });

    folderEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderEl.classList.remove('drag-target-folder');

      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          if (data && data.path) {
            state.moveItem(data.path, folderNode.path);
          }
        } catch (err) {
          this.showAlertDialog('Перемещение', err.message || 'Ошибка перемещения');
        }
      } else if ((e.dataTransfer.items && e.dataTransfer.items.length > 0) || (e.dataTransfer.files && e.dataTransfer.files.length > 0)) {
        await this.handleExternalDrop(e.dataTransfer, folderNode.path);
      }
    });

    folderEl.addEventListener('click', (e) => {
      if (!e.target.closest('.tree-item-actions')) {
        if (this.collapsedFolders.has(folderNode.path)) {
          this.collapsedFolders.delete(folderNode.path);
        } else {
          this.collapsedFolders.add(folderNode.path);
        }
        this.render();
      }
    });

    const addFileBtn = folderEl.querySelector('.add-file-inside-btn');
    if (addFileBtn) {
      addFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showNewFileDialog(folderNode.path);
      });
    }

    const addFolderBtn = folderEl.querySelector('.add-folder-inside-btn');
    if (addFolderBtn) {
      addFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showNewFolderDialog(folderNode.path);
      });
    }

    const renameBtn = folderEl.querySelector('.rename-btn');
    if (renameBtn) {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showRenameFolderDialog(folderNode.path);
      });
    }

    const deleteBtn = folderEl.querySelector('.delete-file-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await this.showConfirmDialog(
          'Удаление папки',
          `Вы действительно хотите удалить папку <strong>"${this.escapeHtml(folderNode.name)}"</strong> и все файлы внутри?`
        );
        if (confirmed) {
          state.deleteFolder(folderNode.path);
        }
      });
    }

    container.appendChild(folderEl);

    if (!isCollapsed) {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-children-container';
      this.renderNodeChildren(folderNode, childContainer, level + 1);
      container.appendChild(childContainer);
    }
  }

  renderFileItem(fileNode, container, level) {
    const isActive = fileNode.path === state.activeFile;
    const itemEl = document.createElement('div');
    itemEl.className = `tree-item ${isActive ? 'active' : ''}`;
    itemEl.style.paddingLeft = `${12 + level * 14}px`;
    itemEl.dataset.path = fileNode.path;
    itemEl.draggable = true;

    itemEl.innerHTML = `
      <div class="tree-item-name">
        <span class="tree-item-icon">${this.getFileIcon(fileNode.name)}</span>
        <span class="tree-label">${this.escapeHtml(fileNode.name)}</span>
      </div>
      <div class="tree-item-actions">
        <button class="tree-action-btn rename-btn" title="Переименовать">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M12.146.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-4 1a.5.5 0 0 1-.65-.65l1-4a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.806 3.224 3.224-.806a.5.5 0 0 1 .123-.057l-2.484-2.484a.5.5 0 0 1-.057.123z"/>
          </svg>
        </button>
        <button class="tree-action-btn delete-file-btn" title="Удалить файл">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    `;

    // Drag events for file
    itemEl.addEventListener('dragstart', (e) => {
      if (document.body.classList.contains('resizing-active')) {
        e.preventDefault();
        return;
      }
      const rect = itemEl.getBoundingClientRect();
      if (e.clientX > rect.right - 14) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      itemEl.classList.add('dragging');
      e.dataTransfer.setData('application/json', JSON.stringify({
        path: fileNode.path,
        isFolder: false
      }));
      e.dataTransfer.effectAllowed = 'move';
    });

    itemEl.addEventListener('dragend', () => {
      itemEl.classList.remove('dragging');
      this.clearAllDropHighlights();
    });

    // Drop target events for file (drops into file's parent folder, or root if file is in root)
    itemEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      this.clearAllDropHighlights();
      itemEl.classList.add('drag-target-file');
    });

    itemEl.addEventListener('dragleave', (e) => {
      if (!itemEl.contains(e.relatedTarget)) {
        itemEl.classList.remove('drag-target-file');
      }
    });

    itemEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      itemEl.classList.remove('drag-target-file');

      // Determine parent folder of this file
      const parts = fileNode.path.split('/').filter(Boolean);
      parts.pop(); // remove file name
      const parentFolderPath = parts.length > 0 ? '/' + parts.join('/') : '';

      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          if (data && data.path) {
            state.moveItem(data.path, parentFolderPath);
          }
        } catch (err) {
          this.showAlertDialog('Перемещение', err.message || 'Ошибка перемещения');
        }
      } else if ((e.dataTransfer.items && e.dataTransfer.items.length > 0) || (e.dataTransfer.files && e.dataTransfer.files.length > 0)) {
        await this.handleExternalDrop(e.dataTransfer, parentFolderPath);
      }
    });

    itemEl.addEventListener('click', (e) => {
      if (!e.target.closest('.tree-item-actions')) {
        state.openTab(fileNode.path);
      }
    });

    const renameBtn = itemEl.querySelector('.rename-btn');
    if (renameBtn) {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showRenameDialog(fileNode.path);
      });
    }

    const deleteBtn = itemEl.querySelector('.delete-file-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await this.showConfirmDialog(
          'Удаление файла',
          `Вы действительно хотите удалить файл <strong>"${this.escapeHtml(fileNode.name)}"</strong>?`
        );
        if (confirmed) {
          state.deleteFile(fileNode.path);
        }
      });
    }

    container.appendChild(itemEl);
  }

  clearAllDropHighlights() {
    if (!this.containerEl) return;
    this.containerEl.classList.remove('drag-target-root');
    const highlighted = this.containerEl.querySelectorAll('.drag-target-folder');
    highlighted.forEach(el => el.classList.remove('drag-target-folder'));
  }

  updateActiveHighlight() {
    if (!this.containerEl) return;
    const items = this.containerEl.querySelectorAll('.tree-item:not(.tree-folder-item)');
    items.forEach(el => {
      if (el.dataset.path === state.activeFile) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // --- Custom In-App Styled Dialogs ---

  async showNewFileDialog(parentFolderPath = '') {
    const folderHint = parentFolderPath ? ` в папке <code>${this.escapeHtml(parentFolderPath)}</code>` : '';
    const fileName = await this.showInputDialog({
      title: 'Новый файл',
      icon: '📄',
      message: `Введите имя файла${folderHint}:`,
      placeholder: 'main.py, helper.py...',
      defaultValue: '',
      submitText: 'Создать файл'
    });

    if (!fileName) return;

    let cleanName = fileName.trim().replace(/^\/+/, '');
    let targetPath = parentFolderPath ? `${parentFolderPath}/${cleanName}` : `/${cleanName}`;
    if (!targetPath.endsWith('.py') && !targetPath.includes('.')) {
      targetPath += '.py';
    }

    try {
      state.createFile(targetPath, '# ' + cleanName + '\n');
    } catch (err) {
      this.showAlertDialog('Создание файла', err.message);
    }
  }

  async showNewFolderDialog(parentFolderPath = '') {
    const folderHint = parentFolderPath ? ` в <code>${this.escapeHtml(parentFolderPath)}</code>` : '';
    const folderName = await this.showInputDialog({
      title: 'Новая папка',
      icon: '📁',
      message: `Введите имя папки${folderHint}:`,
      placeholder: 'test, utils, data...',
      defaultValue: '',
      submitText: 'Создать папку'
    });

    if (!folderName) return;

    let cleanName = folderName.trim().replace(/^\/+|\/+$/g, '');
    let targetPath = parentFolderPath ? `${parentFolderPath}/${cleanName}` : `/${cleanName}`;

    try {
      state.createFolder(targetPath);
    } catch (err) {
      this.showAlertDialog('Создание папки', err.message);
    }
  }

  async showRenameDialog(oldPath) {
    const currentName = oldPath.split('/').filter(Boolean).pop();
    const newName = await this.showInputDialog({
      title: 'Переименование файла',
      icon: '✏️',
      message: 'Введите новое имя файла:',
      placeholder: currentName,
      defaultValue: currentName,
      submitText: 'Переименовать'
    });

    if (!newName || newName === currentName) return;

    const parts = oldPath.split('/').filter(Boolean);
    parts.pop();
    parts.push(newName.trim());
    const newPath = '/' + parts.join('/');

    try {
      state.renameFile(oldPath, newPath);
    } catch (err) {
      this.showAlertDialog('Переименование файла', err.message);
    }
  }

  async showRenameFolderDialog(oldPath) {
    const currentName = oldPath.split('/').filter(Boolean).pop();
    const newName = await this.showInputDialog({
      title: 'Переименование папки',
      icon: '✏️',
      message: 'Введите новое имя папки:',
      placeholder: currentName,
      defaultValue: currentName,
      submitText: 'Переименовать'
    });

    if (!newName || newName === currentName) return;

    const parts = oldPath.split('/').filter(Boolean);
    parts.pop();
    parts.push(newName.trim());
    const newPath = '/' + parts.join('/');

    try {
      state.renameFolder(oldPath, newPath);
    } catch (err) {
      this.showAlertDialog('Переименование папки', err.message);
    }
  }

  showAlertDialog(title, message, icon = '⚠️') {
    return showAlertModal({ title, message, icon });
  }

  showInputDialog({ title, icon, message, placeholder, defaultValue, submitText }) {
    return showPromptModal({ title, icon, message, placeholder, defaultValue, submitText });
  }

  showConfirmDialog(title, message) {
    return showConfirmModal({ title, message, isDanger: true });
  }

  getFileIcon(fileName) {
    return getFileIcon(fileName, 14, this.escapeHtml(fileName));
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
