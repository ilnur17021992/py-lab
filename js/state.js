// js/state.js - Reactive state management and auto-save handler
import { db } from './db.js';

class AppState extends EventTarget {
  constructor() {
    super();
    this.currentProject = null;
    this.activeFile = null;
    this.openTabs = [];
    this.saveTimeout = null;
    this.isSaving = false;
  }

  async loadProject(id) {
    const project = await db.getProject(id);
    if (!project) throw new Error('Проект не найден');

    this.currentProject = project;
    this.openTabs = project.openTabs && project.openTabs.length > 0
      ? project.openTabs
      : (Object.keys(project.files).length > 0 ? [Object.keys(project.files)[0]] : ['/main.py']);

    this.activeFile = project.activeFile && project.files[project.activeFile] !== undefined
      ? project.activeFile
      : this.openTabs[0];

    this.emitChange('project-loaded', { project });
    return this.currentProject;
  }

  emitChange(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
    this.dispatchEvent(new CustomEvent('state-changed', { detail: { type, ...detail } }));
  }

  getActiveContent() {
    if (!this.currentProject || !this.activeFile) return '';
    return this.currentProject.files[this.activeFile] || '';
  }

  updateFileContent(path, content) {
    if (!this.currentProject) return;
    if (this.currentProject.files[path] === content) return;

    this.currentProject.files[path] = content;
    this.scheduleAutoSave();
    this.emitChange('file-content-changed', { path, content });
  }

  setActiveFile(path) {
    if (!this.currentProject || !this.currentProject.files.hasOwnProperty(path)) return;

    this.activeFile = path;
    if (!this.openTabs.includes(path)) {
      this.openTabs.push(path);
    }
    this.currentProject.activeFile = path;
    this.currentProject.openTabs = [...this.openTabs];

    this.scheduleAutoSave();
    this.emitChange('active-file-changed', { path, content: this.currentProject.files[path] });
  }

  openTab(path) {
    if (!this.openTabs.includes(path)) {
      this.openTabs.push(path);
    }
    this.setActiveFile(path);
    this.emitChange('tabs-changed', { tabs: this.openTabs });
  }

  closeTab(path) {
    const index = this.openTabs.indexOf(path);
    if (index === -1) return;

    this.openTabs.splice(index, 1);

    if (this.activeFile === path) {
      if (this.openTabs.length > 0) {
        const nextIndex = Math.min(index, this.openTabs.length - 1);
        this.setActiveFile(this.openTabs[nextIndex]);
      } else {
        this.activeFile = null;
        this.emitChange('active-file-changed', { path: null, content: '' });
      }
    }

    if (this.currentProject) {
      this.currentProject.openTabs = [...this.openTabs];
      this.scheduleAutoSave();
    }

    this.emitChange('tabs-changed', { tabs: this.openTabs });
  }

  reorderTabs(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.openTabs.length) return;
    if (toIndex < 0 || toIndex >= this.openTabs.length) return;
    if (fromIndex === toIndex) return;

    const [movedTab] = this.openTabs.splice(fromIndex, 1);
    this.openTabs.splice(toIndex, 0, movedTab);

    if (this.currentProject) {
      this.currentProject.openTabs = [...this.openTabs];
      this.scheduleAutoSave();
    }

    this.emitChange('tabs-changed', { tabs: this.openTabs });
  }

  createFile(path, initialContent = '') {
    if (!this.currentProject) return;
    if (!path.startsWith('/')) path = '/' + path;

    if (this.currentProject.files.hasOwnProperty(path)) {
      throw new Error('Файл уже существует');
    }

    this.currentProject.files[path] = initialContent;
    this.openTab(path);
    this.scheduleAutoSave();
    this.emitChange('file-created', { path });
  }

  deleteFile(path) {
    if (!this.currentProject) return;
    if (!this.currentProject.files.hasOwnProperty(path)) return;

    delete this.currentProject.files[path];
    this.closeTab(path);

    const remainingFiles = Object.keys(this.currentProject.files);
    if (remainingFiles.length === 0) {
      this.currentProject.files['/main.py'] = '# Новый файл\\nprint("Hello World!")';
      this.openTab('/main.py');
    }

    this.scheduleAutoSave();
    this.emitChange('file-deleted', { path });
  }

  renameFile(oldPath, newPath) {
    if (!this.currentProject || !this.currentProject.files.hasOwnProperty(oldPath)) return;
    if (!newPath.startsWith('/')) newPath = '/' + newPath;
    if (oldPath === newPath) return;

    if (this.currentProject.files.hasOwnProperty(newPath)) {
      throw new Error('Файл с таким именем уже существует');
    }

    const content = this.currentProject.files[oldPath];
    delete this.currentProject.files[oldPath];
    this.currentProject.files[newPath] = content;

    const tabIndex = this.openTabs.indexOf(oldPath);
    if (tabIndex !== -1) {
      this.openTabs[tabIndex] = newPath;
    }

    if (this.activeFile === oldPath) {
      this.activeFile = newPath;
    }

    this.currentProject.activeFile = this.activeFile;
    this.currentProject.openTabs = [...this.openTabs];

    this.scheduleAutoSave();
    this.emitChange('file-renamed', { oldPath, newPath });
  }

  createFolder(folderPath) {
    if (!this.currentProject) return;
    if (!folderPath.startsWith('/')) folderPath = '/' + folderPath;
    folderPath = folderPath.replace(/\/+$/, '');

    if (!this.currentProject.folders) {
      this.currentProject.folders = [];
    }

    if (this.currentProject.folders.includes(folderPath)) {
      throw new Error('Папка уже существует');
    }

    this.currentProject.folders.push(folderPath);
    this.scheduleAutoSave();
    this.emitChange('folder-created', { folderPath });
  }

  deleteFolder(folderPath) {
    if (!this.currentProject) return;
    if (!folderPath.startsWith('/')) folderPath = '/' + folderPath;
    folderPath = folderPath.replace(/\/+$/, '');

    if (this.currentProject.folders) {
      this.currentProject.folders = this.currentProject.folders.filter(
        f => f !== folderPath && !f.startsWith(folderPath + '/')
      );
    }

    const prefix = folderPath + '/';
    const filesToDelete = Object.keys(this.currentProject.files || {}).filter(
      p => p.startsWith(prefix)
    );

    filesToDelete.forEach(p => {
      delete this.currentProject.files[p];
      this.closeTab(p);
    });

    if (Object.keys(this.currentProject.files).length === 0) {
      this.currentProject.files['/main.py'] = '# Новый файл\nprint("Hello World!")';
      this.openTab('/main.py');
    }

    this.scheduleAutoSave();
    this.emitChange('folder-deleted', { folderPath });
  }

  renameFolder(oldPath, newPath) {
    if (!this.currentProject) return;
    if (!oldPath.startsWith('/')) oldPath = '/' + oldPath;
    if (!newPath.startsWith('/')) newPath = '/' + newPath;
    oldPath = oldPath.replace(/\/+$/, '');
    newPath = newPath.replace(/\/+$/, '');
    if (oldPath === newPath) return;

    if (!this.currentProject.folders) {
      this.currentProject.folders = [];
    }

    this.currentProject.folders = this.currentProject.folders.map(f => {
      if (f === oldPath) return newPath;
      if (f.startsWith(oldPath + '/')) return newPath + f.slice(oldPath.length);
      return f;
    });

    const oldPrefix = oldPath + '/';
    const newPrefix = newPath + '/';

    const filesToRename = Object.keys(this.currentProject.files || {}).filter(
      p => p.startsWith(oldPrefix)
    );

    filesToRename.forEach(p => {
      const content = this.currentProject.files[p];
      const renamedPath = newPrefix + p.slice(oldPrefix.length);
      delete this.currentProject.files[p];
      this.currentProject.files[renamedPath] = content;

      const tabIndex = this.openTabs.indexOf(p);
      if (tabIndex !== -1) {
        this.openTabs[tabIndex] = renamedPath;
      }
      if (this.activeFile === p) {
        this.activeFile = renamedPath;
      }
    });

    this.currentProject.activeFile = this.activeFile;
    this.currentProject.openTabs = [...this.openTabs];

    this.scheduleAutoSave();
    this.emitChange('folder-renamed', { oldPath, newPath });
  }

  moveItem(sourcePath, targetFolderPath) {
    if (!this.currentProject) return;
    if (!sourcePath.startsWith('/')) sourcePath = '/' + sourcePath;
    if (targetFolderPath && !targetFolderPath.startsWith('/')) targetFolderPath = '/' + targetFolderPath;
    targetFolderPath = (targetFolderPath || '').replace(/\/+$/, '');

    const isFolder = (this.currentProject.folders && this.currentProject.folders.includes(sourcePath)) ||
      Object.keys(this.currentProject.files || {}).some(p => p.startsWith(sourcePath + '/'));

    if (isFolder) {
      if (targetFolderPath === sourcePath || targetFolderPath.startsWith(sourcePath + '/')) {
        throw new Error('Нельзя переместить папку внутрь самой себя или в ее подпапку');
      }

      const folderName = sourcePath.split('/').filter(Boolean).pop();
      const newFolderPath = targetFolderPath ? `${targetFolderPath}/${folderName}` : `/${folderName}`;
      if (newFolderPath === sourcePath) return;

      if (!this.currentProject.folders) this.currentProject.folders = [];
      if (this.currentProject.folders.includes(newFolderPath)) {
        throw new Error(`Папка "${folderName}" уже существует в целевой директории`);
      }

      this.renameFolder(sourcePath, newFolderPath);
      this.emitChange('item-moved', { sourcePath, targetPath: newFolderPath, isFolder: true });
    } else {
      if (!this.currentProject.files.hasOwnProperty(sourcePath)) return;

      const fileName = sourcePath.split('/').filter(Boolean).pop();
      const newFilePath = targetFolderPath ? `${targetFolderPath}/${fileName}` : `/${fileName}`;
      if (newFilePath === sourcePath) return;

      if (this.currentProject.files.hasOwnProperty(newFilePath)) {
        throw new Error(`Файл "${fileName}" уже существует в целевой папке`);
      }

      if (targetFolderPath && !this.currentProject.folders?.includes(targetFolderPath)) {
        if (!this.currentProject.folders) this.currentProject.folders = [];
        this.currentProject.folders.push(targetFolderPath);
      }

      this.renameFile(sourcePath, newFilePath);
      this.emitChange('item-moved', { sourcePath, targetPath: newFilePath, isFolder: false });
    }
  }

  importFiles(filesMap, foldersList = []) {
    if (!this.currentProject) return;
    if (!this.currentProject.folders) this.currentProject.folders = [];

    foldersList.forEach(folder => {
      let f = folder.startsWith('/') ? folder : '/' + folder;
      f = f.replace(/\/+$/, '');
      if (f && !this.currentProject.folders.includes(f)) {
        this.currentProject.folders.push(f);
      }
    });

    let firstImportedFile = null;
    for (let [filePath, content] of Object.entries(filesMap)) {
      let p = filePath.startsWith('/') ? filePath : '/' + filePath;
      this.currentProject.files[p] = content;
      if (!firstImportedFile) firstImportedFile = p;
    }

    if (firstImportedFile) {
      this.openTab(firstImportedFile);
    }

    this.scheduleAutoSave();
    this.emitChange('files-imported', { files: filesMap, folders: foldersList });
  }

  renameProject(newName) {
    if (!this.currentProject) return;
    this.currentProject.name = newName.trim() || 'Без названия';
    this.scheduleAutoSave();
    this.emitChange('project-renamed', { name: this.currentProject.name });
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimeout);
    this.emitChange('save-status', { status: 'saving' });

    this.saveTimeout = setTimeout(async () => {
      if (this.currentProject) {
        this.currentProject.openTabs = [...this.openTabs];
        this.currentProject.activeFile = this.activeFile;
        await db.saveProject(this.currentProject);
        this.emitChange('save-status', { status: 'saved' });
      }
    }, 400);
  }

  async forceSave() {
    clearTimeout(this.saveTimeout);
    if (this.currentProject) {
      this.currentProject.openTabs = [...this.openTabs];
      this.currentProject.activeFile = this.activeFile;
      await db.saveProject(this.currentProject);
      this.emitChange('save-status', { status: 'saved' });
    }
  }
}

export const state = new AppState();
