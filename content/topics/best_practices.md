---
id: "best_practices"
title: "ЛУЧШИЕ ПРАКТИКИ"
category: "Мастерство"
tags:
  - "качество кода"
  - "инструменты"
icon: "✨"
summary:
  - "Определяйте ясный контракт: входы, результат и ожидаемые ошибки"
  - "Используйте современные аннотации list[str], dict[str, T] и X | None"
  - "Валидируйте границы, ловите конкретные ошибки и тестируйте контракт"
---

## Теория

<h3>Читаемый контракт</h3>
<p>Хорошая функция делает одну понятную вещь, имеет осмысленное имя и явно определяет допустимые входы, результат и ошибки. Docstring объясняет назначение и важные ограничения, а аннотации позволяют IDE и статическому анализатору проверять соглашение. Для современного Python используйте встроенные обобщения, например <code>list[str]</code>, и объединения <code>str | None</code>.</p>

<h3>Надёжность в границах</h3>
<p>Проверяйте внешние данные на границе системы, не полагайтесь на глобальное состояние и не скрывайте неожиданные исключения. Возвращайте предсказуемый тип или поднимайте документированную конкретную ошибку. Автоматические тесты должны покрывать как успешный сценарий, так и важные ограничения контракта.</p>

## Примеры кода

### Функция с современными аннотациями и контрактом

Контракт: возвращается имя активного пользователя с достаточным рейтингом или <code>None</code>; некорректный рейтинг — <code>ValueError</code>.

```python
def best_active_name(users: list[dict[str, object]], minimum_rating: float = 4.0) -> str | None:
    """Return the first qualifying active user's name, or None when absent."""
    if minimum_rating < 0:
        raise ValueError("minimum_rating must be non-negative")

    for user in users:
        name = user.get("name")
        rating = user.get("rating", 0.0)
        if user.get("active") is True and isinstance(name, str) and isinstance(rating, (int, float)):
            if rating >= minimum_rating:
                return name
    return None

print(best_active_name([{"name": "Ada", "active": True, "rating": 4.8}]))
print(best_active_name([]))
```

### Проверка контракта короткими assert

Эти проверки можно перенести в pytest-тесты, когда функция станет частью проекта.

```python
def divide(total: float, count: int) -> float:
    if count <= 0:
        raise ValueError("count must be positive")
    return total / count

assert divide(10, 2) == 5.0
try:
    divide(10, 0)
except ValueError as error:
    assert "positive" in str(error)
else:
    raise AssertionError("ValueError was expected")
```
