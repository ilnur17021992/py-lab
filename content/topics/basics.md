---
id: "basics"
title: "ОСНОВЫ PYTHON"
category: "Основы"
tags:
  - "основы"
icon: "🐍"
summary:
  - "Python — высокоуровневый, интерпретируемый язык общего назначения"
  - "Проверить версию: python --version"
  - "Интерпретатор: python или python3"
  - "Однострочный комментарий: # комментарий"
  - "Многострочная строка: \"\"\"текст\"\"\""
  - "Отступы определяют блоки кода (4 пробела)"
  - "print(\"Привет, мир!\")"
  - "input(\"Введите значение: \")"
  - "type(value)   id(value)   help()   dir(obj)"
---

## Теория

<h3>Что такое Python?</h3>
<p>Python — высокоуровневый интерпретируемый язык с динамической типизацией и автоматическим управлением памятью. Его синтаксис и стандартная библиотека ориентированы на читаемость и ясность кода.</p>

<h3>Ключевые правила синтаксиса</h3>
<ul>
  <li><strong>Отступы:</strong> блоки в функциях, условиях и циклах выделяются одинаковыми отступами; обычно используют 4 пробела.</li>
  <li><strong>Комментарии:</strong> однострочный комментарий начинается с <code>#</code>. Тройные кавычки создают обычную многострочную строку, а строка в начале модуля, класса или функции становится его <i>docstring</i>.</li>
  <li><strong>Ввод:</strong> <code>input()</code> всегда возвращает <code>str</code>, даже если пользователь ввёл число. Перед проверкой обычно применяют <code>.strip()</code>, а преобразование выполняют только после валидации или в обработке <code>ValueError</code>.</li>
  <li><strong>Интроспекция:</strong> <code>type()</code>, <code>dir()</code> и <code>help()</code> помогают изучать объект. <code>id()</code> возвращает его уникальный идентификатор на время жизни объекта; не стоит считать его универсальным «адресом в памяти».</li>
</ul>

## Примеры кода

### Параметры print(..., sep, end)

Использование разделителя <code>sep</code> и окончания вывода <code>end</code>.

```python
print("Python", "3.12", "WebAssembly", sep=" -> ")
print("Загрузка: ", end="")
print("100% [успешно]")
print("Счёт:", 10, 20, 30, sep=" | ")
```

### Ввод, strip и безопасное преобразование

<code>input()</code> возвращает строку; функция возвращает число или <code>None</code>, не завершая программу ошибкой.

```python
def parse_non_negative_int(text: str) -> int | None:
    text = text.strip()
    if text.isdigit():
        return int(text)
    return None

raw_value = " 42 "  # В программе: input("Введите количество: ")
count = parse_non_negative_int(raw_value)

if count is None:
    print("Введите неотрицательное целое число")
else:
    print(f"Принято: {count}, тип: {type(count).__name__}")
```

### Интроспекция: type, id и dir

Проверка типа, идентификатора и доступных методов объекта.

```python
message = "Привет, мир!"

print("Значение:", message)
print("Тип объекта:", type(message).__name__)
print("Идентификатор объекта:", id(message))
methods = [name for name in dir(message) if not name.startswith("_")][:6]
print("Первые методы строки:", methods)
```

### Многострочные строки и docstring

Тройные кавычки создают строку; первая строка в теле функции документирует функцию.

```python
def rectangle_area(width: float, height: float) -> float:
    """Возвращает площадь прямоугольника."""
    return width * height

note = """Это многострочная строка.
Её можно хранить в переменной и выводить целиком."""

print(note)
print("Docstring:", rectangle_area.__doc__)
print("Площадь:", rectangle_area(20, 10))
```
