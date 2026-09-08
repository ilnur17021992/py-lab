---
id: "roadmap"
title: "ПУТЬ К МАСТЕРСТВУ В PYTHON"
category: "Мастерство"
tags:
  - "инструменты"
  - "основы"
icon: "🏆"
summary:
  - "Карта связывает 39 тем курса от синтаксиса до практик разработки"
  - "Закрепляйте каждый этап небольшим работающим мини-проектом"
  - "Возвращайтесь к тестам, типам и качеству кода на каждом уровне"
---

## Теория

<h3>Карта 39-тематического курса</h3>
<p>Двигайтесь по реестру тем: основы и коллекции → Conditions, Loops, Functions и Recursion → Comprehensions, Exceptions и Common Exceptions → OOP, итераторы, декораторы и контекстные менеджеры. Затем изучите Files, Data Formats, Databases, Modules, Packages и Common Modules; закрепите стандартную библиотеку через Datetime, Regex и Builtins. Завершающий слой — Typing, Asyncio, Testing, Logging, Venv, Tooling, CLI argparse, Common Mistakes и Best Practices. Каждая карточка в каталоге уже расположена в рекомендуемой последовательности.</p>

<h3>Мини-проекты как контрольные точки</h3>
<ol>
  <li>После основ: консольный калькулятор или конвертер единиц с Conditions и Functions.</li>
  <li>После коллекций и файлов: менеджер задач, сохраняющий JSON через Files и Data Formats.</li>
  <li>После ООП и ошибок: библиотека учёта книг с валидацией и Exceptions.</li>
  <li>После tooling и testing: тот же проект в <code>.venv</code>, с типами, pytest и Ruff.</li>
  <li>После Asyncio и Databases: небольшой клиент API или сервис задач с ограничением конкурентности.</li>
</ol>

## Примеры кода

### Планирование следующего учебного шага

Небольшой скрипт превращает темы и контрольные точки в выполнимый план.

```python
milestones = {
    "основы": ["variables", "types", "conditions", "functions", "calculator"],
    "данные": ["collections", "files", "data_formats", "task_manager"],
    "качество": ["typing", "venv", "tooling", "testing", "library_app"],
    "практика": ["asyncio", "databases", "logging", "api_client"],
}

for stage, items in milestones.items():
    print(f"{stage}: {' -> '.join(items)}")
```
