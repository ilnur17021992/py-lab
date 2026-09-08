---
id: "packages"
title: "ПАКЕТЫ И СТРУКТУРА ПРОЕКТА"
category: "Функции и модули"
tags:
  - "модули"
icon: "📁"
summary:
  - "Модуль — один файл Python; пакет объединяет связанные модули"
  - "__init__.py создаёт обычный пакет и определяет его публичный API"
  - "python -m запускает пакет или модуль в корректном импортном контексте"
  - "pyproject.toml хранит метаданные и настройки проекта"
---

## Теория

<h3>Модуль, пакет и дистрибутив</h3>
<p><b>Модуль</b> — файл <code>.py</code>. <b>Пакет</b> — пространство имён из связанных модулей, обычно каталог с <code>__init__.py</code>. <b>Дистрибутив</b> — устанавливаемый артефакт проекта, описанный в <code>pyproject.toml</code>; его имя может отличаться от импортируемого пакета. Виртуальное окружение изолирует зависимости, но само не является пакетом.</p>

<h3>Импорты и точка входа</h3>
<p>Внутри пакета предпочитайте абсолютные импорты для ясности, а относительные — только для близких внутренних модулей. Не используйте <code>from module import *</code>: он скрывает происхождение имён. Файл <code>__main__.py</code> позволяет запускать пакет командой <code>python -m package_name</code>; так Python правильно настраивает импортный контекст.</p>

<h3>Рекомендуемая структура</h3>
<pre>project/
├── pyproject.toml
├── src/
│   └── weather_cli/
│       ├── __init__.py
│       ├── __main__.py
│       └── formatting.py
└── tests/
    └── test_formatting.py</pre>
<p>Установка и зависимости рассматриваются в уроках о виртуальных окружениях и инструментах. Здесь важно разделить код приложения, его точку входа и тесты.</p>

## Примеры кода

### Пакет, созданный во временном каталоге

Пример создаёт минимальный пакет и запускает его так же, как это делает команда <code>python -m</code>.

```python
from pathlib import Path
from subprocess import run
import sys
from tempfile import TemporaryDirectory

with TemporaryDirectory() as directory:
    root = Path(directory)
    package = root / "weather_cli"
    package.mkdir()
    (package / "__init__.py").write_text('__all__ = ["format_city"]\n', encoding="utf-8")
    (package / "formatting.py").write_text(
        'def format_city(name: str) -> str:\n    return name.strip().title()\n',
        encoding="utf-8",
    )
    (package / "__main__.py").write_text(
        'from .formatting import format_city\n'
        'import sys\n'
        'print(f"Прогноз для: {format_city(sys.argv[1])}")\n',
        encoding="utf-8",
    )

    completed = run(
        [sys.executable, "-m", "weather_cli", "казань"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    print(completed.stdout.strip())
```

### Абсолютный и относительный импорт

Оба варианта допустимы внутри пакета; выбирайте последовательный стиль команды.

```python
package_layout = {
    "weather_cli.formatting": "def format_city(name): return name.title()",
    "weather_cli.__main__": "from .formatting import format_city",
}

absolute_import = "from weather_cli.formatting import format_city"
relative_import = "from .formatting import format_city"

print(package_layout["weather_cli.formatting"])
print(absolute_import)
print(relative_import)
```

### Публичный API пакета

<code>__all__</code> документирует имена, которые пакет намеренно экспортирует.

```python
public_api = ("format_city",)

for name in public_api:
    print(f"Публичное имя: {name}")
```