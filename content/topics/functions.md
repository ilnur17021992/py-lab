---
id: "functions"
title: "ФУНКЦИИ"
category: "Управление потоком"
tags:
  - "основы"
  - "функции"
icon: "⚙️"
summary:
  - "Определение: def func(a, b=0, *args, **kwargs): return a + b"
  - "Позиционные и именованные: def fn(pos_only, /, standard, *, kw_only):"
  - "Распаковка аргументов: fn(*list_args, **dict_kwargs)"
  - "Ловушка мутабельных аргументов: def fn(x=None): if x is None: x = []"
  - "Область видимости LEGB: Local -> Enclosing -> Global -> Built-in"
  - "Ключевые слова: global и nonlocal"
  - "Лямбды и функции высшего порядка: map, filter, sorted(key=...)"
---

## Теория

<h3>Функции в Python</h3>
<p>Функции — объекты первого класса: их можно присваивать переменным, передавать как аргументы и возвращать из других функций. Хорошая функция делает одну понятную работу и возвращает результат вместо скрытого изменения внешнего состояния.</p>

<h3>Разделяйте обязанности</h3>
<p>Для кода, который получает данные от пользователя или сети, полезно разделять три этапа: <b>parsing</b> преобразует внешний текст в значение, <b>validation</b> проверяет правила, а <b>business logic</b> работает уже с корректными данными. Так функции проще тестировать, а вызывающий код сам решает, как показать ошибку.</p>

<h3>Параметры и значения по умолчанию</h3>
<ul>
  <li><code>/</code> делает параметры слева строго позиционными, а <code>*</code> — параметры справа строго именованными.</li>
  <li><code>*args</code> и <code>**kwargs</code> собирают дополнительные аргументы; при вызове эти операторы распаковывают коллекции.</li>
  <li>Значения по умолчанию вычисляются один раз при определении функции. Для изменяемых значений используйте <code>None</code> и создавайте объект внутри функции.</li>
</ul>

<h3>Области видимости LEGB</h3>
<table class="theory-table">
  <thead><tr><th>Уровень</th><th>Название</th><th>Описание</th></tr></thead>
  <tbody>
    <tr><td><b>L</b></td><td>Local</td><td>Имена внутри текущей функции.</td></tr>
    <tr><td><b>E</b></td><td>Enclosing</td><td>Имена внешней функции для вложенной функции.</td></tr>
    <tr><td><b>G</b></td><td>Global</td><td>Имена уровня модуля.</td></tr>
    <tr><td><b>B</b></td><td>Built-in</td><td>Встроенные имена, например <code>len</code> и <code>print</code>.</td></tr>
  </tbody>
</table>

## Примеры кода

### Parsing, validation и business logic

Каждая функция отвечает за свой этап, а ошибка возвращается вызывающему коду как значение.

```python
def parse_quantity(text: str) -> int | None:
    try:
        return int(text.strip())
    except ValueError:
        return None


def validate_quantity(quantity: int) -> str | None:
    if quantity <= 0:
        return "Количество должно быть больше нуля"
    return None


def calculate_total(quantity: int, unit_price: int) -> int:
    return quantity * unit_price

raw_quantity = "3"
quantity = parse_quantity(raw_quantity)
error = "Введите целое число" if quantity is None else validate_quantity(quantity)

if error:
    print(f"Ошибка: {error}")
else:
    print("Итого:", calculate_total(quantity, unit_price=250))
```

### Позиционные (/) и именованные (*) параметры

Сигнатура явно задаёт допустимый способ передачи аргументов.

```python
def configure_server(host, port, /, timeout=30, *, secure=True, retry=3):
    protocol = "https" if secure else "http"
    return f"{protocol}://{host}:{port}; timeout={timeout}; retry={retry}"

address = configure_server("127.0.0.1", 8080, 60, secure=False, retry=5)
print(address)
```

### Распаковка коллекций в аргументы

Список распаковывается в позиционные, а словарь — в именованные аргументы.

```python
def make_request(method, url, timeout=10, headers=None):
    headers = {} if headers is None else headers
    return f"{method} {url}; timeout={timeout}; headers={headers}"

params = ["POST", "https://api.example.com/v1/auth"]
options = {"timeout": 25, "headers": {"Authorization": "Bearer token"}}
print(make_request(*params, **options))
```

### Изменяемые аргументы по умолчанию

<code>None</code> гарантирует новый список для вызова без переданного каталога.

```python
def add_item(item, catalog=None):
    if catalog is None:
        catalog = []
    catalog.append(item)
    return catalog

print(add_item("книга"))
print(add_item("ручка"))
existing_catalog = ["блокнот"]
print(add_item("карандаш", existing_catalog))
```

### Область видимости LEGB: nonlocal

Вложенная функция изменяет переменную объёмлющей функции через <code>nonlocal</code>.

```python
def make_counter():
    count = 0

    def increment():
        nonlocal count
        count += 1
        return count

    return increment

counter = make_counter()
print(counter())
print(counter())
```
