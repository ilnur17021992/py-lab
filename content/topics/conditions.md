---
id: "conditions"
title: "УСЛОВИЯ И PATTERN MATCHING"
category: "Управление потоком"
tags:
  - "основы"
icon: "🔀"
summary:
  - "if / elif / else: классическое ветвление"
  - "Тернарный оператор: x if условие else y"
  - "Falsy-значения: None, False, 0, пустые строки и коллекции"
  - "Pattern Matching (3.10+): match value: case pattern:"
  - "Деструктуризация структур: case [x, y], case {'status': s}"
  - "Условия-гарды: case value if condition:"
---

## Теория

<h3>Условные конструкции if-elif-else:</h3>
<p>В Python любое выражение в условии неявно приводится к <code>bool</code>.</p>

<h3>Что считается ложным (Falsy values):</h3>
<ul>
  <li><code>False</code> и <code>None</code></li>
  <li>Числовые нули: <code>0</code>, <code>0.0</code>, <code>0j</code></li>
  <li>Пустые последовательности и коллекции: <code>""</code>, <code>[]</code>, <code>()</code>, <code>{}</code>, <code>set()</code></li>
</ul>

<h3>Структурное сопоставление с образцом (Pattern Matching, Python 3.10+):</h3>
<p>Конструкция <code>match / case</code> (PEP 634) принципиально превосходит классический <code>switch/case</code> других языков. Она умеет проверять не только точные значения, но и форму (структуру) данных, мгновенно извлекая нужные поля (деструктуризация):</p>
<ul>
  <li><code>case [first, *rest]:</code> — сопоставление списков и кортежей с распаковкой.</li>
  <li><code>case {"status": s, "data": payload}:</code> — поиск обязательных ключей в словарях и привязка их значений к переменным.</li>
  <li><code>case int() | float():</code> — проверка принадлежности типам или их объединениям.</li>
  <li><b>Условия-гарды (Guards):</b> <code>case x if x > 0:</code> — дополнительное условие, проверяемое только после совпадения шаблона.</li>
  <li><code>case _:</code> — подстановочный знак (wildcard), срабатывающий, если ни один из предыдущих шаблонов не подошел (аналог <code>else</code> или <code>default</code>).</li>
</ul>


## Примеры кода

### Ветвление if - elif - else

Классическая многоуровневая проверка условий.

```python
score = 82

if score >= 90:
    grade = "Отлично (A)"
elif score >= 75:
    grade = "Хорошо (B)"
elif score >= 60:
    grade = "Удовлетворительно (C)"
else:
    grade = "Неудовлетворительно (F)"

print(f"Балл: {score}, Результат: {grade}")
```

### Тернарный условный оператор

Компактная однострочная форма: x if condition else y.

```python
user_role = "admin"
access = "Полный доступ разрешён" if user_role == "admin" else "Ограниченный доступ"
print("Статус доступа:", access)

age = 17
can_enter = "Вход разрешен" if age >= 18 else "Вход только с родителями"
print("Возрастной контроль:", can_enter)
```

### Проверка на Falsy-значения

Идиоматическая проверка непустых списков и строк.

```python
user_input = ""
notifications = []

# Идиоматично: if not items вместо len(items) == 0
if not user_input:
    print("Строка ввода пуста")

if not notifications:
    print("Новых уведомлений нет")
```

### Сопоставление с образцом: Pattern Matching (Python 3.10+)

Разбор команд и кортежей с деструктуризацией и условиями-гардами.

```python
def handle_command(command):
    match command:
        case ("quit",):
            return "Завершение программы"
        case ("move", (int() | float()) as x, (int() | float()) as y) if x >= 0 and y >= 0:
            return f"Перемещение в точку ({x}, {y})"
        case ("move", _, _):
            return "Ошибка: координаты должны быть неотрицательными числами!"
        case ("set_name", str() as name):
            return f"Имя игрока установлено: {name}"
        case _:
            return f"Неизвестная команда: {command}"

print(handle_command(("quit",)))
print(handle_command(("move", 10, 25.5)))
print(handle_command(("move", -5, 10)))
print(handle_command(("set_name", "Алексей")))
print(handle_command(("shoot", 100)))
```

### Деструктуризация словарей и ответов API через match case

Безопасное извлечение вложенных данных без риска KeyError.

```python
def parse_api_response(response: dict) -> str:
    match response:
        case {"status": 200, "data": {"user_id": uid, "email": email}}:
            return f"Пользователь #{uid} успешно авторизован: {email}"
        case {"status": 404, "error": msg}:
            return f"Ресурс не найден: {msg}"
        case {"status": code, "error": msg} if code >= 500:
            return f"Критический сбой сервера (код {code}): {msg}"
        case _:
            return "Нестандартный или поврежденный ответ сервера"

# 1. Успешный ответ
print(parse_api_response({"status": 200, "data": {"user_id": 42, "email": "dev@python.org"}}))

# 2. Ошибка клиента
print(parse_api_response({"status": 404, "error": "Пользователь не найден"}))

# 3. Ошибка сервера с условием-гардом
print(parse_api_response({"status": 502, "error": "Bad Gateway"}))
```
