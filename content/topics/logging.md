---
id: "logging"
title: "ЛОГИРОВАНИЕ"
category: "Инструменты"
tags:
  - "тестирование"
  - "инструменты"
icon: "📜"
summary:
  - "import logging"
  - "logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')"
  - "log = logging.getLogger(__name__)"
  - "log.debug(\"Отладочное сообщение\")"
  - "log.info(\"Информационное сообщение\")"
  - "log.warning(\"Предупреждение\")"
  - "log.error(\"Сообщение об ошибке\")"
---

## Теория

<h3>Модуль logging:</h3>
      <p>В продакшен-коде вызовы <code>print()</code> заменяются на <code>logging</code>, позволяющий фильтровать сообщения по уровням важности и форматировать временные метки.</p>

      <table class="theory-table">
        <thead><tr><th>Уровень</th><th>Числовой вес</th><th>Назначение</th></tr></thead>
        <tbody>
          <tr><td><code>DEBUG</code></td><td>10</td><td>Подробная отладочная информация.</td></tr>
          <tr><td><code>INFO</code></td><td>20</td><td>Подтверждение нормальной работы системы.</td></tr>
          <tr><td><code>WARNING</code></td><td>30</td><td>Предупреждение о нештатной ситуации, не блокирующей работу.</td></tr>
          <tr><td><code>ERROR</code></td><td>40</td><td>Серьёзная ошибка: операция не смогла выполниться.</td></tr>
          <tr><td><code>CRITICAL</code></td><td>50</td><td>Критический сбой, ведущий к остановке приложения.</td></tr>
        </tbody>
      </table>

<h3>Логгеры библиотек и настройка приложения</h3>
<p>В каждом модуле создавайте <code>logger = logging.getLogger(__name__)</code>: имя отражает пакет и позволяет приложению централизованно настраивать уровни и обработчики. Не вызывайте <code>basicConfig()</code> внутри библиотечного модуля — конфигурация принадлежит точке входа приложения. Передавайте данные лениво: <code>logger.info("Заказ %s", order_id)</code>, а не f-строку, чтобы форматирование не выполнялось при отключённом уровне. В блоке <code>except</code> используйте <code>logger.exception(...)</code>: он добавит traceback и должен вызываться только при активном исключении.</p>


## Примеры кода

### Конфигурация в точке входа и логирование исключения

Модуль получает именованный логгер, а <code>main()</code> настраивает приложение один раз.

```python
import logging

logger = logging.getLogger(__name__)


def load_port(text: str) -> int:
    try:
        port = int(text)
    except ValueError:
        logger.exception("Не удалось разобрать порт %r", text)
        raise
    logger.info("Сервис слушает порт %s", port)
    return port


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s: %(message)s",
    )
    try:
        load_port("not-a-number")
    except ValueError:
        logger.warning("Приложение завершило обработку неверной настройки")


if __name__ == "__main__":
    main()
```
