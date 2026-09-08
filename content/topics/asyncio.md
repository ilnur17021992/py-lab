---
id: "asyncio"
title: "АСИНХРОННОЕ ПРОГРАММИРОВАНИЕ (ASYNCIO)"
category: "Асинхронность"
tags:
  - "асинхронность"
  - "продвинутый"
icon: "⚡"
summary:
  - "В обычном скрипте точка входа: asyncio.run(main())"
  - "asyncio подходит для неблокирующего I/O, не для CPU-bound работы"
  - "gather, timeout и Semaphore требуют явной обработки отмены и ошибок"
---

## Теория

<h3>Цикл событий и точка входа</h3>
<p>Корутина, объявленная через <code>async def</code>, начинает работу только после <code>await</code> или планирования задачей. В обычном Python-скрипте используйте один раз <code>asyncio.run(main())</code>. В средах с уже работающим циклом событий (например, некоторых notebook) этот вызов не подходит и среда задаёт собственный способ ожидания.</p>

<h3>I/O, ошибки и отмена</h3>
<p>Asyncio даёт конкурентность для неблокирующего I/O: сетевых запросов, сокетов и поддерживающих asyncio библиотек. Блокирующие вызовы и CPU-bound вычисления останавливают цикл; для них нужны подходящие процессы, потоки или <code>asyncio.to_thread</code>. При ошибке <code>gather</code> по умолчанию передаёт первое исключение вызывающему и не следует полагаться на него как на автоматическую отмену остальных задач. Таймаут отменяет ожидаемую операцию; корутина должна освобождать ресурсы в <code>finally</code> и не подавлять <code>CancelledError</code>.</p>

## Примеры кода

### asyncio.run в обычном скрипте

<code>asyncio.sleep</code> отдаёт управление циклу, в отличие от <code>time.sleep</code>.

```python
import asyncio


async def fetch(name: str) -> str:
    await asyncio.sleep(0.1)
    return f"data for {name}"


async def main() -> None:
    result = await fetch("profile")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
```

### gather: результат, ошибка и отмена

Созданные задачи очищаются в <code>finally</code>; ошибка одной задачи не заменяется молчаливым успехом остальных.

```python
import asyncio


async def job(name: str, fail: bool = False) -> str:
    try:
        await asyncio.sleep(0.1)
        if fail:
            raise RuntimeError(f"{name} failed")
        return name
    finally:
        print(f"cleanup {name}")


async def main() -> None:
    tasks = [asyncio.create_task(job("first")), asyncio.create_task(job("second", True))]
    try:
        await asyncio.gather(*tasks)
    except RuntimeError as error:
        print(error)
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


asyncio.run(main())
```

### Timeout, cancellation и Semaphore

Ограничение параллелизма защищает внешний сервис; таймаут вызывает отмену ожидаемой корутины.

```python
import asyncio


async def request(item: int, limit: asyncio.Semaphore) -> int:
    async with limit:
        try:
            await asyncio.sleep(0.2)
            return item * 2
        finally:
            print(f"finished or cancelled: {item}")


async def main() -> None:
    limit = asyncio.Semaphore(2)
    tasks = [request(item, limit) for item in range(4)]
    try:
        results = await asyncio.wait_for(asyncio.gather(*tasks), timeout=0.25)
        print(results)
    except TimeoutError:
        print("requests timed out and were cancelled")


asyncio.run(main())
```
