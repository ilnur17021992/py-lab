---
id: "builtins"
title: "ПОЛЕЗНЫЕ ВСТРОЕННЫЕ ФУНКЦИИ"
category: "Стандартная библиотека"
tags:
  - "модули"
  - "функции"
icon: "🛠️"
summary:
  - "print()   len()   type()   isinstance()"
  - "str()   int()   float()   bool()"
  - "list()   tuple()   set()   dict()"
  - "range()   enumerate()   zip()"
  - "map()   filter()   sorted()   reversed()"
  - "sum()   min()   max()   any()   all()"
  - "abs()   round()   open()   input()"
---

## Теория

<h3>Встроенные функции (Built-ins):</h3>
      <p>Встроены в глобальное пространство имён Python и всегда доступны без импорта.</p>

      <table class="theory-table">
        <thead><tr><th>Группа</th><th>Функции</th><th>Описание</th></tr></thead>
        <tbody>
          <tr><td>Преобразование типов</td><td><code>int, float, str, bool, list, tuple, set, dict</code></td><td>Приведение значений к нужным типам.</td></tr>
          <tr><td>Итерация и коллекции</td><td><code>range, enumerate, zip, sorted, reversed, map, filter</code></td><td>Создание последовательностей, сортировка, фильтрация.</td></tr>
          <tr><td>Агрегация</td><td><code>sum, min, max, any, all, len</code></td><td>Подсчет суммы, минимума, максимума, логическая проверка всех/хотя бы одного.</td></tr>
          <tr><td>Числовые функции</td><td><code>abs, round, divmod, pow</code></td><td>Модуль числа, математическое округление.</td></tr>
        </tbody>
      </table>


## Примеры кода

### Агрегация: sum, min, max, len, any, all

Вычисление статистик и проверка условий для коллекций.

```python
scores = [85, 92, 78, 99, 64]

print(f"Длина коллекции (len): {len(scores)}")
print(f"Сумма (sum): {sum(scores)}")
print(f"Минимум (min): {min(scores)}, Максимум (max): {max(scores)}")

# any — хотя бы один элемент удовлетворяет условию
print("Есть ли отличники (>90)? (any):", any(s >= 90 for s in scores))
# all — ВСЕ элементы удовлетворяют условию
print("Все ли сдали (>60)? (all):", all(s >= 60 for s in scores))
```

### Преобразование коллекций: map(), filter(), sorted(), reversed()

Использование map, filter, sorted и reversed со списками.

```python
nums = [3, -1, 4, -5, 2, 0]

# 1. filter — оставить только положительные
positives = list(filter(lambda x: x > 0, nums))
print("Положительные (filter):", positives)

# 2. map — удвоить каждый элемент
doubled = list(map(lambda x: x * 2, positives))
print("Удвоенные (map):", doubled)

# 3. sorted — сортировка по возрастанию и убыванию
print("Сортировка (sorted):", sorted(nums))
print("Сортировка по убыванию:", sorted(nums, reverse=True))

# 4. reversed — обратный порядок
print("Разворот (reversed):", list(reversed(sorted(nums))))
```

### Числовые функции и приведение типов: abs, round, int, float, str, bool

Использование abs, round и конструкторов типов.

```python
print("Модуль числа abs(-42):", abs(-42))
print("Округление round(3.14159, 2):", round(3.14159, 2))

# Конструкторы типов
num_from_str = int("150")
float_from_int = float(42)
bool_check = bool("не пустая строка")
str_num = str(12345)

print(f"int: {num_from_str}, float: {float_from_int}, bool: {bool_check}, str: {repr(str_num)}")
```
