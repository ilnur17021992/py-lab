---
id: "testing"
title: "ТЕСТИРОВАНИЕ (PYTEST)"
category: "Инструменты"
tags:
  - "тестирование"
  - "качество кода"
  - "инструменты"
icon: "🧪"
summary:
  - "Тесты pytest живут в test_*.py и запускаются извне: python -m pytest"
  - "pytest.raises проверяет ожидаемые исключения"
  - "fixture готовит данные, parametrize запускает набор случаев"
  - "monkeypatch и Mock изолируют внешние зависимости"
---

## Теория

<h3>Как pytest находит и запускает тесты</h3>
<p>Pytest обычно ищет файлы <code>test_*.py</code> и функции <code>test_*</code>. Это настоящие тесты для терминала или CI: код ниже нужно сохранить в файл, установить <code>pytest</code> и запустить <code>python -m pytest</code>; он не предназначен для запуска в браузерной песочнице урока.</p>

<h3>Проверки и изоляция</h3>
<ul>
  <li><code>assert</code> сравнивает фактический и ожидаемый результат, а pytest показывает различия.</li>
  <li><code>pytest.raises</code> проверяет ожидаемую ошибку, не скрывая другие ошибки.</li>
  <li>Фикстуры создают повторно используемое состояние, параметризация покрывает случаи, а моки заменяют сеть, время и файловую систему.</li>
</ul>

## Примеры кода

### Структура test_*.py и pytest.raises

Сохраните как <code>test_price.py</code> и выполните <code>python -m pytest -q</code> во внешнем терминале.

```python
import pytest


def apply_discount(price: float, percent: int) -> float:
    if not 0 <= percent <= 100:
        raise ValueError("percent must be from 0 to 100")
    return round(price * (1 - percent / 100), 2)


def test_apply_discount() -> None:
    assert apply_discount(100.0, 15) == 85.0


def test_rejects_invalid_discount() -> None:
    with pytest.raises(ValueError, match="0 to 100"):
        apply_discount(100.0, 101)
```

### Fixture и parametrize

Фикстура передаёт подготовленный объект в тест, а один тест запускается для всех наборов данных.

```python
import pytest


@pytest.fixture
def cart() -> list[int]:
    return [100, 200]


@pytest.mark.parametrize(("rate", "expected"), [(0.0, 300.0), (0.1, 270.0)])
def test_cart_total(cart: list[int], rate: float, expected: float) -> None:
    total = sum(cart) * (1 - rate)
    assert total == expected
```

### Mock и monkeypatch

<code>monkeypatch</code> временно заменяет имя в модуле; <code>Mock</code> позволяет проверить вызов зависимости.

```python
import os
from unittest.mock import Mock


def send_receipt(email: str, gateway: object) -> bool:
    return gateway.send(email, "Thanks")


def current_mode() -> str:
    return os.environ.get("APP_MODE", "production")


def test_send_receipt_and_mode(monkeypatch) -> None:
    gateway = Mock()
    gateway.send.return_value = True
    assert send_receipt("ada@example.test", gateway) is True
    gateway.send.assert_called_once_with("ada@example.test", "Thanks")

    monkeypatch.setenv("APP_MODE", "test")
    assert current_mode() == "test"
```
