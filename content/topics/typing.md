---
id: "typing"
title: "АННОТАЦИИ ТИПОВ (TYPING)"
category: "Качество кода"
tags:
  - "качество кода"
  - "продвинутый"
icon: "🏷️"
summary:
  - "Синтаксис 3.10+: x: int | str = 42"
  - "Встроенные дженерики (3.9+): list[str], dict[str, int], set[int]"
  - "Опциональные значения: str | None (или Optional[str])"
  - "Структурированные словари: from typing import TypedDict"
  - "Функции как типы: from typing import Callable"
  - "Ограниченный выбор: from typing import Literal"
  - "Статический анализ: mypy и pyright для поиска багов до запуска"
---

## Теория

<h3>Зачем нужны аннотации типов в Python?</h3>
<p>Python остается языком с динамической типизацией: интерпретатор обычно не проверяет аннотации и не приводит значения к указанному типу. Их используют статические анализаторы (<code>mypy</code>, <code>pyright</code>), IDE и документация; при необходимости аннотации могут читать и проверять библиотеки в рантайме. Проверяйте данные явно на границах приложения.</p>

<h3>Современный синтаксис (Python 3.10+):</h3>
<table class="theory-table">
  <thead><tr><th>Конструкция</th><th>Современный стиль (3.10+)</th><th>Устаревший стиль (3.8)</th></tr></thead>
  <tbody>
    <tr><td>Объединение типов (Union)</td><td><code>int | str</code></td><td><code>Union[int, str]</code></td></tr>
    <tr><td>Опциональное значение</td><td><code>str | None</code></td><td><code>Optional[str]</code></td></tr>
    <tr><td>Коллекции</td><td><code>list[str]</code>, <code>dict[str, int]</code></td><td><code>List[str]</code>, <code>Dict[str, int]</code></td></tr>
    <tr><td>Кортежи переменной длины</td><td><code>tuple[int, ...]</code></td><td><code>Tuple[int, ...]</code></td></tr>
  </tbody>
</table>

<h3>Границы рантайма и продвинутые контракты</h3>
<ul>
  <li><code>TypedDict</code> описывает ожидаемую форму словаря для статического анализатора, но не проверяет JSON в рантайме. На границе приложения (HTTP, файл, очередь) проверяйте данные явно или валидатором.</li>
  <li><code>Literal</code> ограничивает набор допустимых литералов, а <code>Callable</code> описывает передаваемую функцию.</li>
  <li><code>Protocol</code> задаёт структурный интерфейс: объект подходит, если имеет нужные методы, без явного наследования.</li>
  <li><code>Self</code> из <code>typing</code> (Python 3.11+) обозначает экземпляр текущего класса в fluent-методах и альтернативных конструкторах.</li>
</ul>


## Примеры кода

### Базовая типизация функций и коллекций (3.10+)

Аннотирование аргументов, значений по умолчанию и возвращаемого типа.

```python
def format_user_badge(username: str, score: int | float, tags: list[str] | None = None) -> str:
    """Форматирует плашку пользователя с очками и списком тегов."""
    active_tags = ["новичек"] if tags is None else tags
    tags_str = ", ".join(active_tags)
    return f"Пользователь: {username} | Очки: {score:.1f} | Теги: [{tags_str}]"

badge = format_user_badge("alexander", 98.5, ["backend", "python"])
print(badge)

# Опциональный параметр tags=None
default_badge = format_user_badge("guest_01", 15)
print(default_badge)
```

### TypedDict и проверка данных на границе приложения

Аннотация помогает статическому анализатору, а функция проверяет недоверенный объект в рантайме.

```python
from typing import Any, TypedDict


class UserDTO(TypedDict):
    id: int
    email: str
    is_active: bool


def parse_user(raw: object) -> UserDTO:
    if not isinstance(raw, dict):
        raise ValueError("Ожидался объект JSON")
    data: dict[str, Any] = raw
    if not isinstance(data.get("id"), int) or not isinstance(data.get("email"), str):
        raise ValueError("Некорректные поля пользователя")
    if not isinstance(data.get("is_active"), bool):
        raise ValueError("Поле is_active должно быть bool")
    return {"id": data["id"], "email": data["email"], "is_active": data["is_active"]}


print(parse_user({"id": 101, "email": "dev@example.com", "is_active": True}))
```

### Ограничение выбора значений: Literal

Предотвращение опечаток в аргументах-константах (режимы работы, методы).

```python
from typing import Literal

AccessMode = Literal["read", "write", "append"]

def open_channel(channel_name: str, mode: AccessMode) -> str:
    return f"Канал '{channel_name}' открыт в режиме '{mode}'"

print(open_channel("main_socket", "read"))
print(open_channel("logs_stream", "append"))

# При попытке передать mode="delete" mypy и PyCharm подсветят ошибку типизации!
```

### Protocol и Self в Python 3.11

Protocol описывает требуемое поведение, а Self сохраняет тип цепочки вызовов.

```python
from typing import Protocol, Self


class SupportsSend(Protocol):
    def send(self, message: str) -> None: ...


class ConsoleNotifier:
    def send(self, message: str) -> None:
        print(message)


class Request:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}

    def with_header(self, name: str, value: str) -> Self:
        self.headers[name] = value
        return self


def notify(notifier: SupportsSend) -> None:
    notifier.send("Отчёт готов")


request = Request().with_header("Accept", "application/json")
notify(ConsoleNotifier())
print(request.headers)
```