---
id: "loops"
title: "ЦИКЛЫ"
category: "Управление потоком"
tags:
  - "основы"
icon: "🔁"
summary:
  - "Цикл for:\n    for item in iterable:\n        statement"
  - "for c range:\n    for i in range(start, stop, step):\n        statement"
  - "Цикл while:\n    while condition:\n        statement"
  - "break   continue   pass"
  - "enumerate(iterable)   zip(a, b)"
---

## Теория

<h3>Управление циклами</h3>
<ul>
  <li><code>range(start, stop, step)</code> создаёт последовательность чисел с заданным шагом.</li>
  <li><code>enumerate(iterable, start=0)</code> возвращает пары «индекс, элемент».</li>
  <li><code>zip()</code> объединяет элементы коллекций. В Python 3.10+ <code>zip(..., strict=True)</code> вызывает <code>ValueError</code>, если длины не совпадают, и не даёт молча потерять данные.</li>
  <li><code>break</code> завершает цикл, <code>continue</code> переходит к следующей итерации, а <code>pass</code> служит пустой инструкцией.</li>
</ul>

<h3>Цикл с <code>else</code></h3>
<p>Блок <code>else</code> после <code>for</code> или <code>while</code> выполняется, только если цикл завершился без <code>break</code>. Это удобно для поиска: в <code>else</code> можно обработать случай, когда элемент не найден.</p>

<h3>Безопасный <code>while</code></h3>
<p>У цикла повторных попыток должно быть условие остановки: счётчик, дедлайн или явный выход. Ограничение числа попыток защищает программу от бесконечного цикла.</p>

## Примеры кода

### Цикл for и range()

Диапазон включает начало и не включает конец.

```python
print("Чётные числа:")
for number in range(2, 10, 2):
    print(number, end=" ")
print()
```

### Поиск с for...else

<code>else</code> сработает, если <code>break</code> не был выполнен.

```python
users = ["Анна", "Борис", "Светлана"]
target = "Дмитрий"

for user in users:
    if user == target:
        print(f"Пользователь найден: {user}")
        break
else:
    print(f"Пользователь {target} не найден")
```

### Безопасный while с максимумом попыток

Цикл прекращается после успешного ответа или после заданного лимита.

```python
secret = "python"
attempts = ["java", "go", "python"]
max_attempts = 3
attempt = 0

while attempt < max_attempts:
    answer = attempts[attempt]
    attempt += 1
    if answer == secret:
        print(f"Доступ открыт с попытки {attempt}")
        break
    print(f"Попытка {attempt}: неверный пароль")
else:
    print("Лимит попыток исчерпан")
```

### Управляющие операторы: break, continue и pass

<code>continue</code> пропускает текущий шаг, а <code>break</code> завершает цикл.

```python
for number in range(1, 10):
    if number == 3:
        pass  # Место для будущей логики.
    if number % 2 == 0:
        continue
    if number > 7:
        print("Остановка")
        break
    print(f"Нечётное: {number}")
```

### enumerate() и zip(strict=True)

<code>strict=True</code> требует Python 3.10+ и проверяет соответствие длин коллекций.

```python
names = ["Анна", "Борис", "Светлана"]
roles = ["Frontend", "Backend", "DevOps"]

for index, (name, role) in enumerate(zip(names, roles, strict=True), start=1):
    print(f"#{index}: {name} — {role}")
```
