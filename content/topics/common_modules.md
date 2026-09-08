---
id: "common_modules"
title: "ЧАСТО ИСПОЛЬЗУЕМЫЕ МОДУЛИ"
category: "Стандартная библиотека"
tags:
  - "модули"
  - "данные"
icon: "🧰"
summary:
  - "math          → statistics"
  - "random        → datetime"
  - "os            → sys"
  - "pathlib       → re"
  - "json          → csv"
  - "collections   → itertools"
  - "functools     → decimal"
  - "sqlite3       → subprocess"
  - "logging       → argparse"
---

## Теория

<h3>Стандартная библиотека Python:</h3>
      <p>Python поставляется с обширным набором встроенных библиотек («Batteries Included»).</p>

      <table class="theory-table">
        <thead><tr><th>Модуль</th><th>Назначение</th></tr></thead>
        <tbody>
          <tr><td><code>json</code> / <code>csv</code></td><td>Сериализация и парсинг JSON-данных и CSV-таблиц.</td></tr>
          <tr><td><code>collections</code> / <code>itertools</code></td><td>Специализированные структуры (Counter, defaultdict) и комбинаторика.</td></tr>
          <tr><td><code>math</code> / <code>statistics</code></td><td>Математические формулы, медианы, дисперсии.</td></tr>
          <tr><td><code>functools</code> / <code>random</code></td><td>Кэширование lru_cache, генерация случайных чисел.</td></tr>
          <tr><td><code>pathlib</code> / <code>os</code></td><td>Кроссплатформенная работа с путями и файловой системой.</td></tr>
        </tbody>
      </table>


## Примеры кода

### Модуль json: dumps() и loads()

Преобразование Python-словарей в строку JSON и парсинг обратно.

```python
import json

data = {
    "user": "Ильнур",
    "skills": ["Python", "Algorithms", "Wasm"],
    "is_active": True,
    "rating": 4.95
}

# 1. Сериализация в JSON-строку (dumps)
json_string = json.dumps(data, ensure_ascii=False, indent=2)
print("JSON-строка:\n" + json_string)

# 2. Десериализация обратно в Python dict (loads)
parsed_data = json.loads(json_string)
print(f"\nПрочитано: {parsed_data['user']}, навыков: {len(parsed_data['skills'])}")
```

### Модули collections (Counter) и statistics (mean, median)

Подсчет элементов с Counter и статистические функции.

```python
from collections import Counter
import statistics

words = ["python", "code", "dev", "python", "ai", "python", "dev"]
counter = Counter(words)
print("Частота слов (Counter):", dict(counter))
print("Самое частое слово (most_common):", counter.most_common(1))

grades = [85, 90, 78, 92, 88, 95]
print(f"Среднее (mean): {statistics.mean(grades):.1f}")
print(f"Медиана (median): {statistics.median(grades)}")
```

### Модули random и functools (lru_cache)

Случайный выбор элементов и ускорение функций кэшированием.

```python
import random
from functools import lru_cache

# random выбор
items = ["Яблоко", "Банан", "Апельсин", "Манго"]
print("Случайный выбор (choice):", random.choice(items))
print("Случайное число 1..100:", random.randint(1, 100))

# lru_cache для оптимизации рекурсии
@lru_cache(maxsize=128)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print("Фибоначчи(30) с кэшированием lru_cache:", fib(30))
```

### Продвинутые структуры collections: deque и namedtuple

Двусторонняя очередь со скользящим окном и типизированные именованные кортежи.

```python
from collections import deque, namedtuple

# 1. collections.deque с фиксированным размером (кольцевой буфер последних событий)
recent_logs = deque(maxlen=3)
recent_logs.append("Запуск сервера")
recent_logs.append("Подключение БД")
recent_logs.append("Запрос GET /api/users")
recent_logs.append("Запрос POST /api/login")  # "Запуск сервера" автоматически вытеснен!

print("Кольцевой буфер последних 3 логов (deque):", list(recent_logs))

# Эффективная вставка в начало и конец за O(1)
dq = deque([10, 20])
dq.appendleft(5)   # O(1) слева
dq.append(30)      # O(1) справа
print("Двусторонняя очередь:", list(dq))

# 2. collections.namedtuple: компактная структура с доступом по именам полей
Point = namedtuple("Point", ["x", "y", "label"])
pt = Point(12.5, 48.2, "Базовая станция")

print(f"Точка: {pt.label} (X: {pt.x}, Y: {pt.y})")
print("Доступ по индексу pt[0]:", pt[0])
```

### Модуль itertools: бесконечные и комбинаторные генераторы

Потоковая обработка последовательностей без выделения лишней памяти.

```python
import itertools

# 1. itertools.chain: объединение нескольких итерируемых объектов без создания нового списка
list_a = ["alpha", "beta"]
list_b = ["gamma", "delta"]
chained = itertools.chain(list_a, list_b)
print("itertools.chain:", list(chained))

# 2. itertools.islice: безопасный срез бесконечного или ленивого генератора
# (например, берём первые 6 элементов циклического повторения)
colors = ["🔴", "🟢", "🔵"]
cycled = itertools.cycle(colors)
first_six = list(itertools.islice(cycled, 6))
print("itertools.cycle + islice:", " ".join(first_six))

# 3. itertools.permutations и combinations: комбинаторика элементов
team = ["Анна", "Борис", "Влад"]
pairs = list(itertools.combinations(team, 2))
print("Все пары для дежурства (combinations):", pairs)

perms = list(itertools.permutations(["A", "B", "C"], 2))
print("Размещения с учетом порядка (permutations):", perms)
```

### Модуль functools: partial и reduce

Каррирование аргументов для колбэков и свертка коллекций.

```python
from functools import partial, reduce

# 1. functools.partial: фиксация части аргументов функции
def send_email(smtp_server: str, port: int, recipient: str, subject: str) -> str:
    return f"Отправка на {recipient} через {smtp_server}:{port} | Тема: '{subject}'"

# Фиксируем параметры сервера по умолчанию, создавая специализированную функцию
send_prod_alert = partial(send_email, "smtp.production.internal", 587)

# Теперь вызываем с оставшимися аргументами
result = send_prod_alert("devops@company.com", "High CPU Load Alert")
print(result)

# 2. functools.reduce: кумулятивная свертка списка к единому значению
numbers = [1, 2, 3, 4, 5]
# Вычисление произведения всех чисел: (((1*2)*3)*4)*5 = 120
product = reduce(lambda acc, x: acc * x, numbers)
print(f"Произведение элементов {numbers} через reduce:", product)
```
