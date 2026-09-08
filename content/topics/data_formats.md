---
id: "data_formats"
title: "ФОРМАТЫ ДАННЫХ (JSON И CSV)"
category: "Ввод-вывод"
tags:
  - "данные"
  - "коллекции"
icon: "📊"
summary:
  - "JSON в строку: json.dumps(obj, ensure_ascii=False, indent=2)"
  - "JSON из строки: json.loads(json_string)"
  - "Файлы JSON: json.dump(obj, file) и json.load(file)"
  - "Кастомная сериализация: параметр default=lambda o: ..."
  - "Чтение CSV: csv.DictReader(file)"
  - "Запись CSV: writer = csv.DictWriter(file, fieldnames=[...])"
---

## Теория

<h3>Формат JSON в Python:</h3>
<p>JSON (JavaScript Object Notation) — самый популярный текстовый формат обмена данными между веб-сервисами и микросервисами. В стандартной библиотеке Python для него используется модуль <code>json</code>.</p>

<table class="theory-table">
  <thead><tr><th>Python тип</th><th>JSON эквивалент</th><th>Особенности</th></tr></thead>
  <tbody>
    <tr><td><code>dict</code></td><td><code>object {}</code></td><td>Ключи в JSON всегда только строки.</td></tr>
    <tr><td><code>list</code>, <code>tuple</code></td><td><code>array []</code></td><td>Кортежи при сериализации превращаются в JSON-массивы.</td></tr>
    <tr><td><code>str</code></td><td><code>string ""</code></td><td>Всегда в двойных кавычках.</td></tr>
    <tr><td><code>int</code>, <code>float</code></td><td><code>number</code></td><td>Стандартные числа.</td></tr>
    <tr><td><code>True / False</code></td><td><code>true / false</code></td><td>Строчные буквы в JSON.</td></tr>
    <tr><td><code>None</code></td><td><code>null</code></td><td>Пустое значение.</td></tr>
  </tbody>
</table>

<p><b>Ключевые аргументы <code>json.dumps()</code>:</b></p>
<ul>
  <li><code>ensure_ascii=False</code> — сохраняет символы кириллицы и юникода в читаемом виде вместо <code>П...</code>.</li>
  <li><code>indent=2</code> (или 4) — красивое форматирование с отступами (pretty-print).</li>
  <li><code>default=...</code> — функция-обработчик для типов, не поддерживаемых JSON по умолчанию (например, <code>datetime</code>, <code>set</code>).</li>
</ul>

<h3>Недоверенный JSON и CSV</h3>
<p><code>json.loads()</code> и <code>json.load()</code> выбрасывают <code>json.JSONDecodeError</code> для повреждённого синтаксиса. Успешный разбор не делает данные безопасными: JSON из сети, файла или формы нужно проверять по ожидаемой структуре, типам и допустимым значениям до использования. Модуль <code>csv</code> предоставляет <code>DictReader</code> и <code>DictWriter</code>. Всегда открывайте CSV с <code>newline=""</code>, а экранирование запятых, кавычек и переводов строк поручайте модулю через <code>quoting</code>, а не собирайте строки вручную.</p>


## Примеры кода

### Разбор и проверка JSON из внешнего источника

Повреждённые или неподходящие данные отклоняются до обращения к ключам.

```python
import json
from typing import Any


def parse_user(payload: str) -> dict[str, Any] | None:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as error:
        print(f"Некорректный JSON: {error.msg}")
        return None

    if not isinstance(data, dict):
        print("Ожидался JSON-объект")
        return None
    if not isinstance(data.get("id"), int) or not isinstance(data.get("email"), str):
        print("Неверная схема пользователя")
        return None
    return data


print(parse_user('{"id": 7, "email": "dev@example.com"}'))
print(parse_user('{"id": "7"}'))
```

### Кастомная сериализация неподдерживаемых типов (default)

Преобразование объектов datetime, множеств (set) и классов в формат JSON.

```python
import json
from datetime import datetime

class Task:
    def __init__(self, title: str, priority: int):
        self.title = title
        self.priority = priority

data_with_complex_types = {
    "created_at": datetime(2026, 9, 5, 12, 0),
    "unique_tags": {"python", "json", "api"},
    "task": Task("Рефакторинг API", 1)
}

def custom_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, set):
        return sorted(list(obj))
    if isinstance(obj, Task):
        return {"title": obj.title, "priority": obj.priority}
    raise TypeError(f"Тип {type(obj)} не сериализуем!")

serialized = json.dumps(data_with_complex_types, default=custom_serializer, indent=2, ensure_ascii=False)
print("Результат кастомной сериализации:")
print(serialized)
```

### CSV с корректными переводами строк и кавычками

Модуль csv сам заключит содержащие запятую или кавычки поля в кавычки.

```python
import csv
from pathlib import Path

csv_path = Path("employees.csv")
employees = [
    {"name": "Илья", "note": "Работает из Казани, удалённо"},
    {"name": "Дарья", "note": "Сказала: \"готово\""},
]

with csv_path.open("w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["name", "note"],
        quoting=csv.QUOTE_MINIMAL,
    )
    writer.writeheader()
    writer.writerows(employees)

with csv_path.open("r", newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        print(f"{row['name']}: {row['note']}")
```