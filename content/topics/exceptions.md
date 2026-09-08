---
id: "exceptions"
title: "ОБРАБОТКА ОШИБОК"
category: "Продвинутый Python"
tags:
  - "качество кода"
  - "тестирование"
  - "основы"
icon: "🛡️"
summary:
  - "Блоки: try -> except ExceptionType as e -> else -> finally"
  - "Кастомные исключения: class AppError(Exception): pass"
  - "Цепочки исключений: raise ServiceError('Сбой') from original_err"
  - "Подавление контекста: raise NewError() from None"
  - "Перехват нескольких: except (KeyError, ValueError) as err:"
  - "Правило: перехватывать конкретные ошибки, избегать голого 'except:'"
---

## Теория

<h3>Иерархия и блоки обработки</h3>
<p>Прикладные исключения наследуются от <code>Exception</code>. Не используйте пустой <code>except:</code> или <code>except BaseException:</code>: они перехватывают также <code>KeyboardInterrupt</code> и <code>SystemExit</code>. Обрабатывайте только ошибки, которые ожидаете и можете исправить.</p>
<table class="theory-table">
  <thead><tr><th>Блок</th><th>Когда выполняется</th><th>Назначение</th></tr></thead>
  <tbody>
    <tr><td><code>try</code></td><td>Всегда</td><td>Минимальный участок, способный выбросить ошибку.</td></tr>
    <tr><td><code>except SpecificError</code></td><td>При указанной ошибке</td><td>Восстановление или возврат понятного результата.</td></tr>
    <tr><td><code>else</code></td><td>Если ошибки нет</td><td>Логика успешного сценария.</td></tr>
    <tr><td><code>finally</code></td><td>Всегда</td><td>Освобождение ресурсов.</td></tr>
  </tbody>
</table>

<h3>Границы библиотеки и интерфейса</h3>
<p>Библиотечная функция не должна печатать сообщения об ошибках: она возвращает результат или выбрасывает документированное исключение. Решение о выводе, логировании или повторной попытке принимает код интерфейса.</p>

<h3>Цепочки исключений</h3>
<p>Конструкция <code>raise NewError(...) from original_error</code> сохраняет первопричину и полезный traceback. Используйте <code>from None</code> только когда исходный контекст намеренно не нужен пользователю.</p>

## Примеры кода

### Конечный повторный ввод с узким ValueError

Количество попыток ограничено, а обрабатывается только ошибка преобразования числа.

```python
def read_age(input_func=input, max_attempts=3):
    for attempt in range(1, max_attempts + 1):
        try:
            age = int(input_func("Введите возраст: ").strip())
        except ValueError:
            print(f"Попытка {attempt}/{max_attempts}: нужно целое число")
            continue
        if age >= 0:
            return age
        print(f"Попытка {attempt}/{max_attempts}: возраст не может быть отрицательным")
    return None

answers = iter(["", "-2", "27"])
age = read_age(lambda prompt: next(answers))
print("Возраст:", age if age is not None else "не введён")
```

### Библиотечная функция возвращает ошибку вызывающему коду

Функция не печатает и не скрывает ошибку: вызывающий код выбирает представление результата.

```python
def withdraw(amount: int, balance: int) -> tuple[int | None, str | None]:
    if amount <= 0:
        return None, "Сумма должна быть положительной"
    if amount > balance:
        return None, "Недостаточно средств"
    return balance - amount, None

new_balance, error = withdraw(1500, 1000)
if error:
    print(f"Транзакция отклонена: {error}")
else:
    print(f"Новый баланс: {new_balance}")
```

### Создание собственных исключений

Доменные классы ошибок позволяют вызывающему коду перехватывать ошибки нужного уровня.

```python
class PaymentGatewayError(Exception):
    """Базовое исключение платёжного шлюза."""


class InsufficientFundsError(PaymentGatewayError):
    def __init__(self, required, available):
        super().__init__(f"Требуется {required} руб., доступно {available} руб.")


try:
    raise InsufficientFundsError(required=2500, available=1200)
except PaymentGatewayError as error:
    print(f"Ошибка платежа: {error}")
```

### Цепочки исключений: raise ... from

Высокоуровневая ошибка сохраняет исходную причину для диагностики.

```python
class ConfigurationError(Exception):
    pass


def load_port(text: str) -> int:
    try:
        return int(text)
    except ValueError as source_error:
        raise ConfigurationError("Не удалось прочитать порт сервера") from source_error


try:
    load_port("invalid_port")
except ConfigurationError as error:
    print(error)
    print("Причина:", error.__cause__)
```
