---
id: "types"
title: "ТИПЫ ДАННЫХ"
category: "Основы"
tags:
  - "основы"
  - "коллекции"
icon: "📦"
summary:
  - "int  →  целые числа"
  - "float  →  числа с плавающей точкой"
  - "complex  →  комплексные числа"
  - "bool  →  True или False"
  - "str  →  текст / строка"
  - "list  →  упорядоченный, изменяемый"
  - "tuple  →  упорядоченный, неизменяемый"
  - "set  →  неупорядоченный, уникальные элементы"
  - "dict  →  пары ключ-значение"
  - "None  →  нет значения"
  - "type(value)   isinstance(value, type)"
---

## Теория

<h3>Классификация типов данных:</h3>
      <table class="theory-table">
        <thead><tr><th>Категория</th><th>Типы данных</th><th>Особенности</th></tr></thead>
        <tbody>
          <tr><td><strong>Числовые</strong></td><td><code>int</code>, <code>float</code>, <code>complex</code></td><td>Целые числа произвольной длины, вещественные и комплексные числа (<code>1+2j</code>).</td></tr>
          <tr><td><strong>Логические</strong></td><td><code>bool</code></td><td>Значения <code>True</code> и <code>False</code>. Наследуется от <code>int</code> (1 и 0).</td></tr>
          <tr><td><strong>Неизменяемые коллекции</strong></td><td><code>str</code>, <code>tuple</code>, <code>frozenset</code></td><td>После создания объект нельзя изменить в памяти.</td></tr>
          <tr><td><strong>Изменяемые коллекции</strong></td><td><code>list</code>, <code>dict</code>, <code>set</code></td><td>Элементы можно добавлять, удалять и перезаписывать на месте.</td></tr>
          <tr><td><strong>Пустой тип</strong></td><td><code>NoneType</code> (значение <code>None</code>)</td><td>Обозначает отсутствие значения или результат функции без return.</td></tr>
        </tbody>
      </table>


## Примеры кода

### Числовые и логические типы (int, float, complex, bool)

Демонстрация целых, вещественных, комплексных и булевых чисел.

```python
age = 25              # int
price = 199.99        # float
z = 3 + 4j            # complex
is_active = True      # bool

print(f"int: {age}, тип: {type(age).__name__}")
print(f"float: {price}, тип: {type(price).__name__}")
print(f"complex: {z}, действительная часть: {z.real}, мнимая: {z.imag}")
print(f"bool: {is_active}, числовой эквивалент: {int(is_active)}")
```

### Коллекции и объект None

Сравнение list, tuple, set, dict и NoneType.

```python
my_list = [1, 2, 3]                 # list (изменяемый)
my_tuple = (1, 2, 3)                # tuple (неизменяемый)
my_set = {1, 2, 3, 2}               # set (уникальные значения)
my_dict = {"name": "Alex", "id": 1} # dict (ключ-значение)
empty_val = None                    # NoneType

print("list:", my_list, type(my_list).__name__)
print("tuple:", my_tuple, type(my_tuple).__name__)
print("set (без дубликатов):", my_set, type(my_set).__name__)
print("dict:", my_dict, type(my_dict).__name__)
print("None:", empty_val, type(empty_val).__name__)
```

### Проверка типов: isinstance() vs type()

Использование isinstance с поддержкой кортежей типов и наследования.

```python
value = 42

# isinstance поддерживает проверку нескольких типов сразу
print("Целое число или float?", isinstance(value, (int, float)))
print("Является ли строкой?", isinstance(value, str))

# Разница между type и isinstance (bool является подклассом int)
flag = True
print("type(flag) == int:", type(flag) is int)          # False
print("isinstance(flag, int):", isinstance(flag, int))  # True
```
