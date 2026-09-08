---
id: "modules"
title: "МОДУЛИ И ИМПОРТЫ"
category: "Архитектура"
tags:
  - "модули"
  - "основы"
icon: "📦"
summary:
  - "import math"
  - "from math import sqrt"
  - "import numpy as np"
  - "from module import name as alias"
  - "from module import *   (избегайте)"
  - "if __name__ == '__main__':\n    main()"
---

## Теория

<h3>Импорты в Python</h3>
<ul>
  <li><code>import math</code> импортирует модуль, доступ остаётся явным: <code>math.sqrt(16)</code>.</li>
  <li><code>from math import sqrt</code> уместен для небольшого стабильного набора имён; псевдоним <code>as</code> должен быть понятен читателю.</li>
  <li>Первый импорт выполняет код модуля и кэширует объект в <code>sys.modules</code>; последующие импорты обычно используют этот кэш. Поэтому не размещайте сетевые запросы, запись файлов и другую существенную работу на уровне модуля.</li>
  <li><code>if __name__ == "__main__": main()</code> запускает CLI-код только при прямом запуске, а не при импорте.</li>
</ul>
<h3>Пакеты и границы модулей</h3>
<p>Пакет — каталог с модулями; <code>__init__.py</code> может формировать его публичный API, но не обязан импортировать всё подряд. Избегайте <code>from module import *</code>: оно скрывает происхождение имён и осложняет анализ. Не создавайте циклические импорты: вынесите общий код в третий модуль или передавайте зависимость явно.</p>


## Примеры кода

### Варианты импортов: модуль, функция и псевдонимы (as)

Использование import, from ... import и псевдонимов alias.

```python
import math
from math import pi, pow as power_fn

print(f"Квадратный корень math.sqrt(25): {math.sqrt(25)}")
print(f"Константа pi: {pi:.4f}")
print(f"Функция power_fn(2, 4): {power_fn(2, 4)}")
```

### Импортный кэш и точка входа модуля

Побочные эффекты запускаются только в <code>main()</code>, а импорт можно использовать повторно.

```python
import math
import sys


def calculate_vat(price: float) -> float:
    return price * 0.20


def main() -> None:
    print(f"НДС: {calculate_vat(10_000):.2f}")
    print("math уже в import cache:", "math" in sys.modules)
    import math as imported_again
    print("Это тот же объект:", math is imported_again)


if __name__ == "__main__":
    main()
```
