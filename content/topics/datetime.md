---
id: "datetime"
title: "DATETIME"
category: "Стандартная библиотека"
tags:
  - "модули"
  - "данные"
icon: "⏰"
summary:
  - "from datetime import datetime, timedelta, timezone, date, time"
  - "Сейчас: datetime.now()"
  - "UTC: datetime.now(timezone.utc)"
  - "Дата: date(2024, 5, 20)   Время: time(12, 30)"
  - "Добавить/вычесть: timedelta(days=1)"
  - "Формат: now.strftime('%Y-%m-%d %H:%M:%S')"
  - "Разбор: datetime.strptime(text, '%Y-%m-%d')"
---

## Теория

<h3>Naive и aware datetime</h3>
<p><code>datetime</code> без <code>tzinfo</code> — <em>naive</em>: он не описывает, в какой временной зоне находится момент. <em>Aware</em> объект содержит зону или смещение и подходит для обмена данными и арифметики моментов времени. Не смешивайте naive и aware значения: сравнение вызовет <code>TypeError</code>. Храните и передавайте моменты времени в UTC через <code>datetime.now(timezone.utc)</code>, а для пользовательского отображения преобразуйте их методом <code>astimezone()</code>.</p>

<h3>ISO 8601 и часовые пояса</h3>
<p><code>isoformat()</code> создаёт переносимую строку ISO 8601, а <code>datetime.fromisoformat()</code> разбирает её, включая смещение. Для именованных зон стандартная библиотека предоставляет <code>zoneinfo.ZoneInfo</code>; это корректно учитывает летнее время. Не присваивайте другой <code>tzinfo</code> через <code>replace()</code> для конвертации уже известного момента — используйте <code>astimezone()</code>.</p>


## Примеры кода

### UTC как внутренний формат и отображение в зоне пользователя

Один и тот же момент времени показывается по-разному в UTC и Москве.

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

created_at = datetime.now(timezone.utc)
moscow = ZoneInfo("Europe/Moscow")

print("UTC:", created_at.isoformat())
print("Москва:", created_at.astimezone(moscow).isoformat())

naive = datetime(2026, 9, 6, 12, 0)
print("Naive tzinfo:", naive.tzinfo)
```

### ISO 8601: сериализация и разбор aware времени

Смещение в строке сохраняет информацию о часовом поясе.

```python
from datetime import datetime, timezone

moment = datetime(2026, 12, 31, 23, 59, tzinfo=timezone.utc)
serialized = moment.isoformat()
restored = datetime.fromisoformat(serialized)

print(serialized)
print(restored, restored.tzinfo)
print("Это один момент:", restored == moment)
```

### Арифметика дат: интервалы timedelta

Вычисление будущих дедлайнов и разницы между датами.

```python
from datetime import datetime, timedelta

start_date = datetime.now()
deadline = start_date + timedelta(days=14, hours=6)

print(f"Старт: {start_date.strftime('%d.%m.%Y')}")
print(f"Дедлайн (+14 дней 6 ч): {deadline.strftime('%d.%m.%Y %H:%M')}")

# Разница между двумя датами
diff = deadline - start_date
print(f"Разница в днях: {diff.days}, всего секунд: {diff.total_seconds():.0f}")
```
