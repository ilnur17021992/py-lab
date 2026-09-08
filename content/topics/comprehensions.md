---
id: "comprehensions"
title: "ГЕНЕРАТОРЫ ВКЛЮЧЕНИЙ"
category: "Синтаксис"
tags:
  - "коллекции"
  - "продвинутый"
icon: "⚡"
summary:
  - "List, set и dict comprehensions создают коллекцию сразу"
  - "Generator expression вычисляет элементы лениво"
  - "Выбирайте читаемость, а не только краткость"
---

## Теория

<h3>Создание коллекций</h3>
<p>Включения компактно выражают преобразование и фильтрацию: <code>[expr for item in iterable if condition]</code>. List, set и dict comprehensions строят готовую коллекцию и занимают память для её элементов. Set удаляет дубликаты, а при совпадении ключей dict сохраняет последнее значение.</p>

<h3>Скорость, память и читаемость</h3>
<p>Включение часто удобнее явного цикла и иногда быстрее, но это не гарантия. Генераторное выражение <code>(...)</code> обычно экономит память, потому что выдаёт значения по запросу; оно одноразовое. Если выражение стало многоуровневым или содержит сложную бизнес-логику, обычный цикл часто понятнее.</p>

## Примеры кода

### List, set и dict comprehensions

Каждый вариант возвращает готовую коллекцию своего типа.

```python
numbers = [-2, -1, 0, 1, 2, 2, 3]

positive_squares = [number**2 for number in numbers if number > 0]
unique_absolute = {abs(number) for number in numbers}
labels = {number: "even" if number % 2 == 0 else "odd" for number in numbers}

print(positive_squares)
print(unique_absolute)
print(labels)
```

### Ленивое генераторное выражение

Генератор не создаёт миллион квадратов заранее; <code>sum</code> потребляет его один раз.

```python
import sys

squares = (number**2 for number in range(1_000_000))
print("generator size:", sys.getsizeof(squares))
print("first three:", [next(squares) for _ in range(3)])
print("remaining sum:", sum(squares))
```
