---
id: "lists"
title: "СПИСКИ"
category: "Коллекции"
tags:
  - "коллекции"
  - "основы"
icon: "📋"
summary:
  - "Создание: items = [1, 2, 3]"
  - "Доступ: items[0]   items[-1]   items[1:4]"
  - "Добавление: items.append(x)   items.extend([4, 5])"
  - "Вставка: items.insert(index, x)"
  - "Удалить по значению: items.remove(x)"
  - "Удалить по индексу: items.pop(index)"
  - "Удаление: del items[index]"
  - "items.clear()   items.index(x)   items.count(x)"
  - "items.sort()   items.reverse()"
  - "sorted(items)   reversed(items)"
  - "x in items"
---

## Теория

<h3>Списки</h3>
<p>Список — упорядоченная изменяемая коллекция. Доступ по индексу в среднем занимает <code>O(1)</code>; добавление в конец через <code>append()</code> амортизированно <code>O(1)</code>. Поиск значения и вставка в начало требуют прохода или сдвига элементов.</p>

<h3>Методы списков</h3>
<table class="theory-table">
  <thead><tr><th>Метод</th><th>Действие</th><th>Изменяет исходный список?</th></tr></thead>
  <tbody>
    <tr><td><code>append(x)</code></td><td>Добавляет один элемент в конец.</td><td>Да</td></tr>
    <tr><td><code>extend(iterable)</code></td><td>Добавляет все элементы итерируемого объекта.</td><td>Да</td></tr>
    <tr><td><code>pop([index])</code></td><td>Удаляет и возвращает элемент.</td><td>Да</td></tr>
    <tr><td><code>sort()</code> / <code>sorted()</code></td><td>Сортирует на месте / возвращает новый список.</td><td>Да / нет</td></tr>
    <tr><td><code>reverse()</code> / <code>reversed()</code></td><td>Разворачивает на месте / возвращает итератор.</td><td>Да / нет</td></tr>
  </tbody>
</table>

<h3>Ссылка и копия</h3>
<p>Присваивание <code>b = a</code> не копирует список: обе переменные ссылаются на один объект. Поверхностную копию создают через <code>a.copy()</code>, <code>list(a)</code> или срез <code>a[:]</code>. Вложенные изменяемые объекты при этом остаются общими; для независимой вложенной структуры нужен <code>copy.deepcopy()</code>.</p>

## Примеры кода

### Добавление элементов: append, extend и insert

Разница между добавлением одного элемента, расширением списка и вставкой по индексу.

```python
numbers = [1, 2, 3]
numbers.append(4)
numbers.extend([5, 6])
numbers.insert(0, 0)
print(numbers)
```

### Ссылка и поверхностная копия

Изменение через ссылку видно в исходном списке, а изменение поверхностной копии — нет.

```python
original = ["план", "реализация"]
alias = original
copy_of_original = original.copy()

alias.append("проверка")
copy_of_original.append("документация")

print("original:", original)
print("alias:", alias)
print("copy:", copy_of_original)
print("original is alias:", original is alias)
print("original is copy:", original is copy_of_original)
```

### Удаление элементов: remove, pop, del и clear

Разные способы удаления по значению, индексу и полной очистки.

```python
fruits = ["яблоко", "банан", "апельсин", "банан", "киви"]
fruits.remove("банан")
removed = fruits.pop(1)
del fruits[0]
print("Извлечён:", removed)
print("Осталось:", fruits)
fruits.clear()
print("После clear:", fruits)
```

### Поиск и сортировка

<code>sorted()</code> сохраняет исходный список, а <code>list.index()</code> ищет первое вхождение.

```python
scores = [10, 20, 30, 20, 40]
print("Количество 20:", scores.count(20))
print("Индекс 30:", scores.index(30))
print("Есть ли 99:", 99 in scores)
print("Отсортированная копия:", sorted(scores, reverse=True))
print("Исходный список:", scores)
```
