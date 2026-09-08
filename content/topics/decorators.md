---
id: "decorators"
title: "ДЕКОРАТОРЫ И ЗАМЫКАНИЯ"
category: "Продвинутый Python"
tags:
  - "функции"
  - "продвинутый"
icon: "🎀"
summary:
  - "Замыкание сохраняет значения внешней области видимости"
  - "@wraps сохраняет имя, документацию и __wrapped__ функции"
  - "Retry повторяет только ожидаемые временные ошибки"
---

## Теория

<h3>Замыкания и обёртки</h3>
<p>Замыкание — вложенная функция, которая использует переменные внешней функции после её завершения. Декоратор получает вызываемый объект и возвращает другой. Запись <code>@decorator</code> эквивалентна <code>func = decorator(func)</code>.</p>

<h3>Метаданные и безопасный retry</h3>
<p>Обёртка должна использовать <code>functools.wraps</code>, иначе инструменты увидят имя и документацию wrapper. Повторять следует только конкретные временные исключения и ограниченное число раз. Не перехватывайте без разбора <code>Exception</code>: ошибки программирования и отмены должны быть видны вызывающему коду.</p>

## Примеры кода

### Замыкание и @wraps

Декоратор сохраняет метаданные исходной функции и передаёт ей аргументы.

```python
from collections.abc import Callable
from functools import wraps


def with_prefix(prefix: str) -> Callable[[Callable[[str], str]], Callable[[str], str]]:
    def decorate(func: Callable[[str], str]) -> Callable[[str], str]:
        @wraps(func)
        def wrapper(name: str) -> str:
            return prefix + func(name)
        return wrapper
    return decorate


@with_prefix("Hello, ")
def greet(name: str) -> str:
    """Return a greeting."""
    return name

print(greet("Ada"), greet.__name__, greet.__doc__)
```

### Retry конкретной временной ошибки

После последней неудачной попытки исходное исключение пробрасывается дальше.

```python
from collections.abc import Callable
from functools import wraps
from typing import TypeVar

T = TypeVar("T")


def retry(attempts: int) -> Callable[[Callable[[], T]], Callable[[], T]]:
    if attempts < 1:
        raise ValueError("attempts must be positive")

    def decorate(func: Callable[[], T]) -> Callable[[], T]:
        @wraps(func)
        def wrapper() -> T:
            for attempt in range(attempts):
                try:
                    return func()
                except ConnectionError:
                    if attempt == attempts - 1:
                        raise
            raise AssertionError("unreachable")
        return wrapper
    return decorate

calls = 0

@retry(3)
def fetch() -> str:
    global calls
    calls += 1
    if calls < 3:
        raise ConnectionError("temporary outage")
    return "ok"

print(fetch())
```
