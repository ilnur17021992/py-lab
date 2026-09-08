---
id: "oop"
title: "ОБЪЕКТНО-ОРИЕНТИРОВАННОЕ ПРОГРАММИРОВАНИЕ (ООП)"
category: "ООП"
tags:
  - "ооп"
  - "продвинутый"
icon: "🏛️"
summary:
  - "Классы и экземпляры: class User: def __init__(self, name):"
  - "Инкапсуляция: публичные, защищенные _attr и приватные __attr"
  - "Свойства: @property и @attr.setter"
  - "Наследование и super(): class Admin(User):"
  - "Методы класса и статические: @classmethod (cls) и @staticmethod"
  - "Магические dunder-методы: __str__, __repr__, __eq__, __len__, __getitem__"
  - "Датаклассы: from dataclasses import dataclass; @dataclass"
---

## Теория

<h3>Создание и инициализация объектов</h3>
<p>В Python класс — шаблон объектов. Метод <code>__new__(cls, ...)</code> создаёт и возвращает экземпляр; обычно его не переопределяют. Затем <code>__init__(self, ...)</code> инициализирует уже созданный экземпляр и обязан вернуть <code>None</code>. Для неизменяемых встроенных типов <code>__new__</code> может быть необходим, но для обычных классов достаточно <code>__init__</code>.</p>

<h3>Ключевые принципы ООП:</h3>
<ul>
  <li><b>Инкапсуляция:</b> скрытие внутреннего состояния объекта.
    <ul>
      <li><code>name</code> — публичный атрибут (доступен отовсюду).</li>
      <li><code>_balance</code> — внутренний атрибут по соглашению: внешний код может его прочитать, но не должен зависеть от него.</li>
      <li><code>__secret_key</code> — включает name mangling (<code>_ClassName__secret_key</code>); это защита от случайных конфликтов имён в наследниках, а не механизм безопасности.</li>
    </ul>
  </li>
  <li><b>Свойства (<code>@property</code>):</b> позволяют обращаться к методу как к обычному полю объекта, инкапсулируя валидацию или вычисляемые значения.</li>
  <li><b>Наследование:</b> повторное использование логики. Вызов <code>super().__init__(...)</code> запускает инициализатор базового класса.</li>
  <li><b>Полиморфизм:</b> возможность работы с объектами разных классов через единый интерфейс.</li>
</ul>

<h3>Магические методы (Dunder Methods):</h3>
<table class="theory-table">
  <thead><tr><th>Метод</th><th>Вызов / Назначение</th><th>Пример</th></tr></thead>
  <tbody>
    <tr><td><code>__str__(self)</code></td><td><code>str(obj)</code>, <code>print(obj)</code></td><td>Человекочитаемое представление объекта.</td></tr>
    <tr><td><code>__repr__(self)</code></td><td><code>repr(obj)</code>, вывод в REPL</td><td>Точное строковое представление для разработчика и отладки.</td></tr>
    <tr><td><code>__eq__(self, other)</code></td><td><code>obj1 == obj2</code></td><td>Пользовательское сравнение объектов по содержимому.</td></tr>
    <tr><td><code>__len__(self)</code></td><td><code>len(obj)</code></td><td>Возвращает длину/размер пользовательской коллекции.</td></tr>
    <tr><td><code>__getitem__(self, key)</code></td><td><code>obj[key]</code></td><td>Доступ по индексу или ключу.</td></tr>
  </tbody>
</table>

<h3>Деньги и композиция</h3>
<p>Не храните деньги в <code>float</code>: двоичная арифметика даёт ошибки округления. Используйте <code>Decimal</code>, создавая значения из строк. Предпочитайте композицию наследованию, когда объект <em>содержит</em другой объект (например, заказ содержит позиции), а не является его разновидностью. <code>@dataclass</code> генерирует <code>__init__</code>, <code>__repr__</code> и <code>__eq__</code> для классов данных; в обычном классе <code>__eq__</code> нужно реализовать самостоятельно и вернуть <code>NotImplemented</code> для неподдерживаемого типа.</p>


## Примеры кода

### Инкапсуляция денег через Decimal и property

Внутреннее поле помечено одним подчёркиванием, а публичное свойство сохраняет инвариант.

```python
from decimal import Decimal


class BankAccount:
    def __init__(self, owner: str, initial_balance: Decimal = Decimal("0")) -> None:
        self.owner = owner
        self._balance = Decimal(initial_balance)
        if self._balance < 0:
            raise ValueError("Баланс не может быть отрицательным")

    @property
    def balance(self) -> Decimal:
        return self._balance

    def deposit(self, amount: Decimal) -> None:
        amount = Decimal(amount)
        if amount <= 0:
            raise ValueError("Сумма пополнения должна быть положительной")
        self._balance += amount


account = BankAccount("Алексей", Decimal("1000.00"))
account.deposit(Decimal("0.10"))
print(account.balance)
```

### Наследование и вызов super()

Расширение возможностей базового класса в дочернем классе.

```python
class Employee:
    def __init__(self, name: str, salary: float):
        self.name = name
        self.salary = salary

    def get_role_description(self) -> str:
        return f"Сотрудник {self.name} (оклад: {self.salary} руб.)"

class TeamLead(Employee):
    def __init__(self, name: str, salary: float, team_size: int):
        # Вызов конструктора родительского класса
        super().__init__(name, salary)
        self.team_size = team_size

    def get_role_description(self) -> str:
        base_desc = super().get_role_description()
        return f"{base_desc} | Тимлид команды из {self.team_size} человек"

lead = TeamLead("Мария", 250000.0, team_size=8)
print(lead.get_role_description())
```

### Композиция и собственный __eq__

Заказ содержит позиции, а равенство определяется значимыми полями.

```python
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class LineItem:
    title: str
    price: Decimal


class Order:
    def __init__(self, number: str, items: list[LineItem]) -> None:
        self.number = number
        self.items = list(items)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Order):
            return NotImplemented
        return self.number == other.number and self.items == other.items

    def total(self) -> Decimal:
        return sum((item.price for item in self.items), start=Decimal("0"))


items = [LineItem("Клавиатура", Decimal("4500.00"))]
print(Order("A-1", items) == Order("A-1", items))
print(Order("A-1", items).total())
```

### Методы класса и статические методы

<code>@classmethod</code> получает класс и удобен для альтернативных конструкторов; <code>@staticmethod</code> не получает ни экземпляр, ни класс.

```python
class Temperature:
    def __init__(self, celsius: float) -> None:
        self.celsius = celsius

    @classmethod
    def from_fahrenheit(cls, fahrenheit: float) -> "Temperature":
        return cls((fahrenheit - 32) * 5 / 9)

    @staticmethod
    def is_freezing(celsius: float) -> bool:
        return celsius <= 0


temperature = Temperature.from_fahrenheit(32)
print(temperature.celsius)
print(Temperature.is_freezing(temperature.celsius))
```

### Современные структуры данных: @dataclass

Автоматическая генерация методов для чистых классов хранения информации.

```python
from dataclasses import dataclass, field

@dataclass
class ServerConfig:
    host: str
    port: int = 8080
    debug: bool = False
    tags: list[str] = field(default_factory=list)

# Автоматически сгенерирован читаемый __repr__ и сравнение __eq__
srv1 = ServerConfig(host="10.0.0.1", port=443, debug=True, tags=["web", "prod"])
srv2 = ServerConfig(host="10.0.0.1", port=443, debug=True, tags=["web", "prod"])

print("Датакласс ServerConfig:")
print(srv1)
print("srv1 == srv2 (сравнение по полям):", srv1 == srv2)
```