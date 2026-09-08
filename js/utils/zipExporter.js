// js/utils/zipExporter.js - Export and Import projects via JSZip
import { state } from '../state.js';
import { db } from '../db.js';
import { toast } from '../ui/components/toast.js';

export const zipExporter = {
  async exportCurrentProject() {
    if (!state.currentProject) return;

    try {
      const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
      const zip = new JSZip();

      const files = state.currentProject.files || {};
      for (const [path, content] of Object.entries(files)) {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        zip.file(cleanPath, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const projectName = (state.currentProject.name || 'python_project').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Проект успешно экспортирован в ZIP');
    } catch (err) {
      toast.error('Ошибка при экспорте архива: ' + err.message);
    }
  },

  async importFile(file) {
    if (!file) return;

    try {
      if (file.name.endsWith('.py')) {
        const text = await file.text();
        const projectName = file.name.replace(/\.py$/, '');
        const newProj = await db.createProject(projectName, {
          '/main.py': text
        });
        toast.success('Файл успешно импортирован');
        window.location.href = `ide.html?project=${encodeURIComponent(newProj.id)}`;
      } else if (file.name.endsWith('.zip')) {
        const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
        const zip = await JSZip.loadAsync(file);
        const files = {};

        const entries = Object.keys(zip.files);
        for (const filename of entries) {
          const zipEntry = zip.files[filename];
          if (!zipEntry.dir) {
            const content = await zipEntry.async('string');
            const cleanPath = filename.startsWith('/') ? filename : '/' + filename;
            files[cleanPath] = content;
          }
        }

        if (Object.keys(files).length === 0) {
          files['/main.py'] = '# Пустой импортированный проект\\nprint("Hello!")';
        }

        const projectName = file.name.replace(/\.zip$/, '');
        const newProj = await db.createProject(projectName, files);
        toast.success('Проект успешно импортирован');
        window.location.href = `ide.html?project=${encodeURIComponent(newProj.id)}`;
      } else {
        toast.warning('Поддерживаются только .zip архивы и .py файлы');
      }
    } catch (err) {
      toast.error('Ошибка при импорте: ' + err.message);
    }
  }
};
