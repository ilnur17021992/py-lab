---
id: "sets"
title: "МНОЖЕСТВА"
category: "Коллекции"
tags:
  - "коллекции"
icon: "⭕"
summary:
  - "Создание: s = {1, 2, 3}      Пустое: set()"
  - "Добавление: s.add(x)   Обновление: s.update([4, 5])"
  - "Удаление: s.remove(x)   Удалить без ошибки: s.discard(x)"
  - "Извлечь: s.pop()   Очистить: s.clear()"
  - "Объединение: s1 | s2   Пересечение: s1 & s2"
  - "Разность: s1 - s2   Симметрическая разность: s1 ^ s2"
  - "Подмножество: s1 <= s2   Надмножество: s1 >= s2"
  - "x in s"
---

## Теория

<h3>Множества (Set):</h3>
      <p>Неупорядоченная коллекция уникальных хэшируемых элементов. Проверка наличия <code>x in set</code> выполняется за мгновенное время <strong>O(1)</strong>.</p>

      <table class="theory-table">
        <thead><tr><th>Операция</th><th>Оператор</th><th>Метод</th><th>Смысл</th></tr></thead>
        <tbody>
          <tr><td>Объединение</td><td><code>s1 | s2</code></td><td><code>s1.union(s2)</code></td><td>Все элементы из обоих множеств.</td></tr>
          <tr><td>Пересечение</td><td><code>s1 & s2</code></td><td><code>s1.intersection(s2)</code></td><td>Элементы, присутствующие в обоих множествах.</td></tr>
          <tr><td>Разность</td><td><code>s1 - s2</code></td><td><code>s1.difference(s2)</code></td><td>Элементы из s1, которых нет в s2.</td></tr>
          <tr><td>Симм. разность</td><td><code>s1 ^ s2</code></td><td><code>s1.symmetric_difference(s2)</code></td><td>Элементы, входящие только в одно из множеств.</td></tr>
          <tr><td>Подмножество</td><td><code>s1 <= s2</code></td><td><code>s1.issubset(s2)</code></td><td>Все элементы s1 есть в s2.</td></tr>
        </tbody>
      </table>


## Примеры кода

### Добавление и удаление: add, update, remove, discard, pop, clear

Разница между remove (вызывает ошибку) и discard (безопасное удаление).

```python
tech = {"Python", "JavaScript"}

# add — добавить один элемент
tech.add("TypeScript")
# update — добавить коллекцию
tech.update(["HTML", "CSS"])
print("После add и update:", tech)

# discard — удаляет элемент безопасно (не вызывает ошибки, если элемента нет)
tech.discard("Go") # нет ошибки!
tech.discard("HTML")

# remove — удаляет, но бросит KeyError, если элемента нет
tech.remove("CSS")
print("После discard и remove:", tech)

# pop — извлекает произвольный элемент
item = tech.pop()
print(f"Извлечен элемент (pop): {item}")

# clear — очистить множество
tech.clear()
print("После clear():", tech)
```

### Теоретико-множественные операции (|, &, -, ^, <=, >=)

Объединение, пересечение, разность, симметрическая разность и проверка подмножеств.

```python
group_a = {"Python", "SQL", "Git", "Docker"}
group_b = {"Python", "JavaScript", "HTML", "Docker"}

print("Объединение (|):", group_a | group_b)
print("Пересечение (&):", group_a & group_b)
print("Разность (A - B):", group_a - group_b)
print("Симметрическая разность (A ^ B):", group_a ^ group_b)

# Проверка подмножеств
subset = {"Python", "Git"}
print("Является ли subset подмножеством group_a (<=)?", subset <= group_a)
print("Является ли group_a надмножеством subset (>=)?", group_a >= subset)
```
