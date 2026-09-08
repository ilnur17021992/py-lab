---
id: "common_exceptions"
title: "ЧАСТЫЕ ИСКЛЮЧЕНИЯ"
category: "Ошибки"
tags:
  - "качество кода"
  - "тестирование"
icon: "⚠️"
summary:
  - "TypeError: неподходящий тип; ValueError: допустимый тип, но неверное значение"
  - "KeyError и IndexError означают отсутствующий ключ или индекс"
  - "Ловите только ожидаемые конкретные исключения"
---

## Теория

<h3>Что означают распространённые ошибки</h3>
<ul>
  <li><code>TypeError</code>: операция не поддерживает переданный тип; <code>ValueError</code>: тип подходит, но значение нет.</li>
  <li><code>KeyError</code> и <code>IndexError</code>: ключ словаря или индекс последовательности отсутствует.</li>
  <li><code>AttributeError</code>, <code>NameError</code>, <code>FileNotFoundError</code> и <code>ZeroDivisionError</code> указывают соответственно на отсутствующий атрибут, имя, файл или делитель.</li>
</ul>

<h3>Обработка по контракту</h3>
<p>Перехватывайте только ошибки, которые ожидаете и можете обработать. Используйте <code>else</code> для кода после успешного <code>try</code>, а <code>finally</code> — для обязательной очистки. Не превращайте ошибку в незаметное значение без ясного контракта.</p>

## Примеры кода

### TypeError и ValueError

Сначала проверяется тип, затем — содержимое строки.

```python
def parse_age(raw: str) -> int:
    if not isinstance(raw, str):
        raise TypeError("age must be a string")
    age = int(raw)
    if age < 0:
        raise ValueError("age must be non-negative")
    return age

for value in ("42", "-1", 42):
    try:
        print(parse_age(value))
    except (TypeError, ValueError) as error:
        print(type(error).__name__, error)
```

### KeyError, IndexError и безопасные альтернативы

<code>get</code> и проверка длины уместны, если отсутствие данных — штатный случай.

```python
profile = {"name": "Ada"}
items = ["first"]

print(profile.get("email", "not provided"))
print(items[0] if items else "empty")

try:
    print(profile["email"])
except KeyError as error:
    print("missing required field:", error)
```

### Ошибки файловой системы

Отсутствующий файл — ожидаемая внешняя ошибка; сообщите о ней вызывающему коду или обработайте явно.

```python
from pathlib import Path

path = Path("settings.json")
try:
    text = path.read_text(encoding="utf-8")
except FileNotFoundError:
    text = "{}"
    print(f"{path} не найден; используем пустые настройки")

print(text)
```
