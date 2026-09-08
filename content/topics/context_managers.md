---
id: "context_managers"
title: "МЕНЕДЖЕРЫ КОНТЕКСТА (WITH)"
category: "Продвинутый Python"
tags:
  - "продвинутый"
  - "качество кода"
icon: "🚪"
summary:
  - "with освобождает ресурс даже при исключении"
  - "__exit__ получает ошибку; True подавляет её сознательно"
  - "contextmanager использует yield и finally для очистки"
---

## Теория

<h3>Гарантированная очистка</h3>
<p><code>with</code> вызывает <code>__enter__()</code> перед телом блока и <code>__exit__()</code> при выходе — в том числе при исключении. Поэтому файлы, блокировки и соединения следует получать через менеджер контекста. Возвращённое из <code>__enter__</code> значение попадает в часть <code>as</code>.</p>

<h3>Исключения и contextlib</h3>
<p><code>__exit__</code> получает тип, значение и traceback исключения. Возврат истинного значения подавляет его, поэтому это нужно делать только для явно ожидаемых ошибок. <code>@contextmanager</code> превращает функцию с одним <code>yield</code> в контекстный менеджер; код в <code>finally</code> выполняется при любом выходе.</p>

## Примеры кода

### Класс с __enter__ и __exit__

Менеджер освобождает ресурс и не скрывает исключения, потому что возвращает <code>False</code>.

```python
class Connection:
    def __enter__(self) -> "Connection":
        print("open")
        return self

    def query(self, sql: str) -> str:
        return f"result for {sql}"

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        print("close")
        return False

with Connection() as connection:
    print(connection.query("SELECT 1"))
```

### @contextmanager и finally

Даже если тело блока завершится ошибкой, строка <code>release</code> будет напечатана.

```python
from contextlib import contextmanager


@contextmanager
def temporary_setting(settings: dict[str, str], key: str, value: str):
    old_value = settings.get(key)
    settings[key] = value
    try:
        yield settings
    finally:
        if old_value is None:
            settings.pop(key, None)
        else:
            settings[key] = old_value

config = {"mode": "production"}
with temporary_setting(config, "mode", "test"):
    print(config)
print(config)
```
