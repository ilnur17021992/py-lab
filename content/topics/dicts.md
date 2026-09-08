---
id: "dicts"
title: "СЛОВАРИ"
category: "Коллекции"
tags:
  - "коллекции"
icon: "📖"
summary:
  - "Создание: d = {'name': 'Alex', 'age': 25}"
  - "Доступ: d['name']      Безопасно: d.get('name', 'N/A')"
  - "Сложность: Поиск, вставка, удаление в среднем O(1)"
  - "Требование к ключам: неизменяемые, хешируемые (hashable) объекты"
  - "Итерация: d.keys(), d.values(), d.items()"
  - "Объединение (3.9+): d1 | d2   Обновить: d1.update(d2)"
  - "Продвинутые структуры: collections.defaultdict, collections.Counter"
---

## Теория

<h3>Словари</h3>
<p>Словарь — изменяемая хеш-таблица, связывающая уникальные хешируемые ключи со значениями. Он сохраняет порядок вставки ключей (гарантировано с Python 3.7). Поиск, вставка и удаление по ключу обычно занимают <code>O(1)</code>.</p>

<h3>Доступ к отсутствующему ключу</h3>
<ul>
  <li><code>d[key]</code> подходит, когда ключ обязателен: при его отсутствии будет <code>KeyError</code>.</li>
  <li><code>d.get(key, default)</code> возвращает запасное значение и не изменяет словарь.</li>
  <li><code>d.setdefault(key, default)</code> возвращает значение ключа, а при отсутствии добавляет <code>default</code>. Это полезно для накопления данных.</li>
</ul>

<h3>Представления словаря</h3>
<p><code>d.keys()</code>, <code>d.values()</code> и <code>d.items()</code> возвращают динамические представления, а не списки: они отражают последующие изменения словаря. Преобразуйте их в <code>list</code>, только если нужен снимок данных.</p>

## Примеры кода

### Чтение и практичная обработка отсутствующих ключей

<code>get()</code> удобен для необязательного поля, а прямой доступ оставляют для обязательного.

```python
profile = {"username": "ilnur_dev", "role": "admin"}

username = profile["username"]
timezone = profile.get("timezone", "UTC")
email = profile.get("email")

print("Пользователь:", username)
print("Часовой пояс:", timezone)
print("Email:", email if email is not None else "не указан")
```

### Накопление значений через setdefault

<code>setdefault()</code> создаёт список только для нового ключа и возвращает сохранённый список.

```python
purchases = [
    ("Электроника", "Ноутбук"),
    ("Книги", "Чистый Python"),
    ("Электроника", "Мышь"),
]

grouped = {}
for category, item in purchases:
    grouped.setdefault(category, []).append(item)

for category, items in grouped.items():
    print(f"{category}: {', '.join(items)}")
```

### Динамические views: keys(), values(), items()

Представления отражают изменения словаря и подходят для обхода без создания лишних списков.

```python
inventory = {"яблоки": 50, "бананы": 30}
keys_view = inventory.keys()
items_view = inventory.items()

inventory["груши"] = 20
print("Ключи:", list(keys_view))
for fruit, count in items_view:
    print(f"{fruit}: {count} шт.")
```

### Обновление, объединение и безопасное извлечение

Оператор <code>|</code> создаёт новый словарь (Python 3.9+), а <code>pop()</code> может вернуть значение по умолчанию.

```python
base_config = {"env": "prod", "port": 8080}
override_config = {"port": 9000, "workers": 4}
merged = base_config | override_config

removed_debug = merged.pop("debug", None)
print("Конфиг:", merged)
print("debug был задан:", removed_debug is not None)
```
