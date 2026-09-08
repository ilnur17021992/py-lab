---
id: "strings"
title: "СТРОКИ И БАЙТЫ"
category: "Синтаксис"
tags:
  - "основы"
  - "коллекции"
  - "данные"
icon: "🔤"
summary:
  - "Строки (str) неизменяемы (immutable)"
  - "Срезы: text[start:stop:step], text[::-1] (реверс)"
  - "Методы: strip(), lower(), upper(), replace(), split(), join()"
  - "F-строки: f\"{price:.2f}\", f\"{discount:.0%}\", f\"{user=}\""
  - "Отладка f-строк (3.8+): f\"{variable=}\""
  - "Байты (bytes): b'binary data', s.encode('utf-8'), b.decode('utf-8')"
---

## Теория

<h3>Строки (str) и их неизменяемость:</h3>
<p>Строки в Python являются последовательностями символов Юникода (Unicode) и строго <b>неизменяемы</b> (immutable). Любая операция над строкой (замена, очистка, перевод регистра) возвращает <i>новый</i> строковый объект в памяти.</p>

<h3>F-строки и спецификаторы формата:</h3>
<table class="theory-table">
  <thead><tr><th>Шаблон</th><th>Результат</th><th>Описание</th></tr></thead>
  <tbody>
    <tr><td><code>f"{x:.2f}"</code></td><td><code>12.35</code></td><td>Округление с плавающей точкой до 2 знаков.</td></tr>
    <tr><td><code>f"{x:>10}" / f"{x:<10}"</code></td><td>Выравнивание</td><td>Выравнивание в поле шириной 10 символов (вправо/влево).</td></tr>
    <tr><td><code>f"{rate:.1%}"</code></td><td><code>15.5%</code></td><td>Автоматическое форматирование процентов (умножение на 100).</td></tr>
    <tr><td><code>f"{var=}"</code></td><td><code>var=42</code></td><td>Режим отладки (выводит имя переменной и её значение).</td></tr>
  </tbody>
</table>

<h3>Строки (str) против байтов (bytes):</h3>
<p>В Python четко разделены текстовые строки <code>str</code> (последовательность Unicode-символов) и бинарные данные <code>bytes</code> (последовательность байт от 0 до 255). Преобразование между ними осуществляется методами кодирования и декодирования:</p>
<ul>
  <li><code>str.encode("utf-8")</code> &rarr; получает <code>bytes</code>.</li>
  <li><code>bytes.decode("utf-8")</code> &rarr; восстанавливает <code>str</code>.</li>
</ul>


## Примеры кода

### Срезы, индексация и реверс строк

Срезы [start:stop:step], отрицательные индексы и реверс [::-1].

```python
text = "Python Language"

print("Первый символ:", text[0])
print("Последний символ:", text[-1])
print("Срез [0:6]:", text[0:6])
print("Каждый 2-й символ:", text[::2])
print("Реверс строки [::-1]:", text[::-1])
```

### Преобразование регистра и очистка (strip, replace, upper)

Методы upper(), lower(), title(), strip() и replace().

```python
raw_email = "   User.Name@Example.COM   \n"

clean_email = raw_email.strip().lower()
print(f"Исходная строка: {repr(raw_email)}")
print(f"Очищенный email: {clean_email}")

header = "python interactive lab"
print("Title Case:", header.title())
print("Замена символов (replace):", header.replace("python", "Python 3.12"))
```

### Разбиение и объединение: split() и join()

Преобразование строки в список слов и сборка обратно через разделитель.

```python
tags_str = "python, webassembly, coding, tutorial"

# Разбиение по запятой с пробелом
tags_list = tags_str.split(", ")
print("Список тегов (split):", tags_list)

# Сборка через разделитель
joined = " #".join([""] + tags_list)
print("Хэштеги (join):", joined.strip())
```

### Продвинутые возможности f-строк и отладка (f"{var=}")

Форматирование валют, процентов и быстрый вывод переменных при отладке.

```python
item = "MacBook Pro"
price = 199990.5
tax_rate = 0.20
is_in_stock = True

# 1. Форматирование чисел и выравнивание
print(f"Товар: {item:<15} | Цена: {price:>10,.2f} руб.")
print(f"НДС:   {tax_rate:.0%}           | Итого: {price * (1 + tax_rate):>10,.2f} руб.")

# 2. Отладочный вывод f"{var=}" (начиная с Python 3.8)
print("\n--- Отладочные дампы ---")
print(f"{item=}, {price=}, {is_in_stock=}")
print(f"{price * 2=}")
```

### Строки против байтов: str, bytes, encode() и decode()

Преобразование текстовых данных в байты и обратно через UTF-8.

```python
original_text = "Привет, мир! 🚀"

# Кодирование строки в последовательность байт
encoded_bytes = original_text.encode("utf-8")
print("Тип:", type(encoded_bytes))
print("Байты:", encoded_bytes)
print(f"Длина строки в символах: {len(original_text)}")
print(f"Длина в байтах (UTF-8): {len(encoded_bytes)}")

# Декодирование обратно в строку
decoded_text = encoded_bytes.decode("utf-8")
assert decoded_text == original_text
print("Восстановленная строка:", decoded_text)
```
