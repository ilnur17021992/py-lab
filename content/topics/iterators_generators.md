---
id: "iterators_generators"
title: "ИТЕРАТОРЫ И ГЕНЕРАТОРЫ"
category: "Продвинутый Python"
tags:
  - "продвинутый"
  - "коллекции"
  - "асинхронность"
icon: "⚡"
summary:
  - "Iterable отдаёт iterator; iterator реализует __next__"
  - "yield создаёт ленивый одноразовый генератор"
  - "Потоковая обработка уменьшает потребление памяти"
---

## Теория

<h3>Протокол итерации</h3>
<p><em>Итерируемый</em> объект передаётся в <code>iter()</code> и возвращает итератор. Итератор возвращает себя из <code>__iter__()</code>, выдаёт следующий элемент через <code>__next__()</code> и завершает поток исключением <code>StopIteration</code>. Цикл <code>for</code> обрабатывает это исключение сам.</p>

<h3>Генераторы и память</h3>
<p>Функция с <code>yield</code> возвращает генератор и сохраняет состояние между значениями. Генераторы особенно полезны для больших или бесконечных потоков, но не делают работу бесплатной: при потреблении будут выполнены все нужные вычисления. Их нельзя надёжно пройти повторно без нового генератора.</p>

## Примеры кода

### Пользовательский итератор

<code>next(iterator, default)</code> возвращает запасное значение вместо проброса <code>StopIteration</code>.

```python
class Countdown:
    def __init__(self, start: int) -> None:
        self.current = start

    def __iter__(self) -> "Countdown":
        return self

    def __next__(self) -> int:
        if self.current == 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

counter = Countdown(2)
print(next(counter), next(counter), next(counter, "done"))
```

### yield и потоковый конвейер

Промежуточные этапы не создают списки с полным набором данных.

```python
def read_lines() -> object:
    for line in ["INFO ready", "ERROR database", "ERROR timeout"]:
        yield line


def errors(lines: object) -> object:
    yield from (line for line in lines if line.startswith("ERROR"))

for message in errors(read_lines()):
    print(message)
```
