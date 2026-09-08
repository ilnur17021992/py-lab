---
id: "tooling"
title: "СОВРЕМЕННЫЙ TOOLING (UV, RUFF, PYPROJECT)"
category: "Инструменты"
tags:
  - "инструменты"
  - "качество кода"
icon: "🛠️"
summary:
  - "pyproject.toml хранит метаданные проекта и настройки инструментов"
  - "uv может управлять окружением и зависимостями; uv.lock фиксирует разрешение"
  - "ruff умеет проверять и форматировать код, но не обязан заменять каждый инструмент"
---

## Теория

<h3>pyproject.toml и зависимости</h3>
<p><code>pyproject.toml</code> — стандартное место для метаданных проекта по PEP 621 и конфигурации инструментов. <code>requirements.txt</code> всё ещё удобен для pip-установки. Проект с uv обычно хранит декларации зависимостей в <code>pyproject.toml</code> и созданный uv файл <code>uv.lock</code>; lock-файл фиксирует конкретное разрешение зависимостей.</p>

<h3>uv и Ruff без абсолютных обещаний</h3>
<p>uv может ускорить управление Python-окружениями и пакетами, а Ruff объединяет множество популярных проверок и форматирование. Подходящие команды и скорость зависят от проекта, версий и выбранной конфигурации: перед внедрением их следует проверить в CI.</p>

## Примеры кода

### Чтение настроек pyproject.toml

<code>tomllib</code> доступен в Python 3.11+ и только читает TOML; запись файла делают отдельным инструментом.

```python
import tomllib

content = b"""
[project]
name = "demo-service"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27"]

[tool.ruff]
line-length = 88
"""

config = tomllib.loads(content.decode())
print(config["project"]["name"])
print(config["tool"]["ruff"]["line-length"])
```

### Проверка команд рабочего процесса

Команды ниже предназначены для терминала; скрипт хранит их как справочные строки и не выполняет shell-команды.

```python
commands = {
    "install dependency": "uv add httpx",
    "create or update lock": "uv lock",
    "sync environment": "uv sync",
    "run tests": "uv run pytest",
    "lint": "uv run ruff check .",
    "format": "uv run ruff format .",
}

for purpose, command in commands.items():
    print(f"{purpose}: {command}")
```
