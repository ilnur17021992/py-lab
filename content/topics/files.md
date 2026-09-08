---
id: "files"
title: "РАБОТА С ФАЙЛАМИ"
category: "Ввод-вывод"
tags:
  - "данные"
  - "инструменты"
icon: "📁"
summary:
  - "Современный подход: from pathlib import Path"
  - "Чтение/запись: Path('file.txt').read_text(encoding='utf-8')"
  - "Классический with open: with open('file.txt', 'r', encoding='utf-8') as f:"
  - "Режимы open: 'r' (чтение), 'w' (перезапись), 'a' (дозапись), 'rb'/'wb' (бинарный)"
  - "Проверка пути: path.exists(), path.is_file(), path.is_dir()"
  - "Поиск файлов: path.glob('*.py'), path.rglob('*.txt')"
---

## Теория

<h3>Пути и ошибки файловой системы</h3>
<p>Для путей используйте <code>pathlib.Path</code>, а для файлов — контекстный менеджер <code>with</code>. Явно указывайте <code>encoding="utf-8"</code> для текста. Ожидаемые ошибки обрабатывайте узко: <code>FileNotFoundError</code> для отсутствующего файла, <code>PermissionError</code> для недостаточных прав, <code>FileExistsError</code> для режима <code>"x"</code> и <code>IsADirectoryError</code>, когда каталог ошибочно используют как файл.</p>

<h3>Каталоги и безопасная замена файла</h3>
<p><code>path.mkdir(parents=True, exist_ok=True)</code> создаёт всю цепочку отсутствующих каталогов и не считает ошибкой уже существующий каталог. Для временных данных используйте <code>tempfile.TemporaryDirectory()</code>: каталог удаляется при выходе из <code>with</code>. Чтобы читатель не увидел частично записанный конфиг, записывайте данные во временный файл в том же каталоге и заменяйте целевой файл через <code>Path.replace()</code>; это атомарная операция в пределах одной файловой системы.</p>

## Примеры кода

### Создание вложенного каталога и обработка ошибок чтения

```python
from pathlib import Path

report_path = Path("var/reports/daily.txt")
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text("Отчёт готов\n", encoding="utf-8")

try:
    print(report_path.read_text(encoding="utf-8"))
    print(Path("var/reports/missing.txt").read_text(encoding="utf-8"))
except FileNotFoundError as error:
    print(f"Файл не найден: {error.filename}")
except PermissionError as error:
    print(f"Недостаточно прав: {error.filename}")
```

### Временный каталог для промежуточных файлов

```python
from pathlib import Path
from tempfile import TemporaryDirectory

with TemporaryDirectory(prefix="report-") as directory:
    workspace = Path(directory)
    draft = workspace / "draft.txt"
    draft.write_text("Промежуточный отчёт", encoding="utf-8")
    print(draft.read_text(encoding="utf-8"))

print("Временный каталог уже удалён")
```

### Атомарная запись конфигурации

```python
from pathlib import Path
from tempfile import NamedTemporaryFile


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temp:
        temp.write(text)
        temporary_path = Path(temp.name)
    temporary_path.replace(path)


config_path = Path("var/config/settings.ini")
atomic_write(config_path, "DEBUG=false\nPORT=8000\n")
print(config_path.read_text(encoding="utf-8"))
```
