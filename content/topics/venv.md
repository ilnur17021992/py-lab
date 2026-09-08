---
id: "venv"
title: "ВИРТУАЛЬНОЕ ОКРУЖЕНИЕ И ПАКЕТЫ"
category: "Инструменты"
tags:
  - "инструменты"
icon: "🌐"
summary:
  - "Создать окружение: python -m venv .venv"
  - "Устанавливать пакеты: python -m pip install package"
  - "requirements.txt описывает зависимости; lock-файл фиксирует разрешённые версии"
---

## Теория

<h3>Изолированное окружение</h3>
<p><code>venv</code> создаёт отдельный интерпретатор и набор пакетов для проекта. После активации <code>python</code> обычно указывает на него, но надёжнее всегда вызывать установщик как <code>python -m pip</code>: так pip точно относится к выбранному Python.</p>

<h3>requirements и lock-файлы</h3>
<p><code>requirements.txt</code> — обычный список требований, который может содержать точные версии или диапазоны. Он не обязательно является lock-файлом. Lock-файл создаёт конкретный менеджер зависимостей и фиксирует полный разрешённый граф версий для воспроизводимой установки; не редактируйте его вручную без необходимости.</p>

## Примеры кода

### Проверка выбранного интерпретатора

Этот скрипт полезен после создания или активации окружения; команды создания и установки выполняются в терминале, а не в Python-блоке.

```python
import sys
from pathlib import Path

python = Path(sys.executable)
print("Python:", python)
print("Version:", sys.version.split()[0])
print("Virtual environment:", sys.prefix != sys.base_prefix)
print("Prefix:", sys.prefix)
```

### Чтение простого requirements.txt

Файл требований может также содержать комментарии, URL и маркеры платформы; это пример для обычных закреплённых строк.

```python
requirements = """
requests==2.32.3
pytest>=8.0
# development tools
ruff==0.6.9
"""

packages = []
for line in requirements.splitlines():
    line = line.strip()
    if line and not line.startswith("#"):
        packages.append(line)

print("Dependencies:", packages)
```
