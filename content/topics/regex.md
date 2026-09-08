---
id: "regex"
title: "РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ"
category: "Работа с текстом"
tags:
  - "модули"
  - "данные"
  - "продвинутый"
icon: "🔍"
summary:
  - "Поиск: re.search(r'\\d+', text)"
  - "Совпадение: re.match(r'Hello', text)"
  - "Найти все: re.findall(r'\\w+', text)"
  - "Замена: re.sub(r'\\d+', 'x', text)"
  - "Шаблоны: \\d цифра   \\w слово   \\s пробел"
  - ". любой символ   ^ начало   $ конец"
---

## Теория

<h3>Модуль re:</h3>
      <table class="theory-table">
        <thead><tr><th>Функция</th><th>Назначение</th></tr></thead>
        <tbody>
          <tr><td><code>re.search(pattern, text)</code></td><td>Ищет первое совпадение в любом месте строки.</td></tr>
          <tr><td><code>re.match(pattern, text)</code></td><td>Проверяет совпадение строго с <strong>начала</strong> строки.</td></tr>
          <tr><td><code>re.findall(pattern, text)</code></td><td>Возвращает список всех найденных непересекающихся совпадений.</td></tr>
          <tr><td><code>re.sub(pattern, repl, text)</code></td><td>Заменяет найденные совпадения на строку <code>repl</code>.</td></tr>
        </tbody>
      </table>

<h3>Проверка формата и ограничения</h3>
<p>Для проверки всей строки предпочитайте <code>fullmatch()</code>: в отличие от <code>match()</code>, он не принимает корректное только начало строки. Повторно используемый шаблон компилируйте через <code>re.compile()</code>; объект <code>Pattern</code> делает код понятнее и избегает повторной компиляции. Именованные группы <code>(?P&lt;name&gt;...)</code> дают устойчивый доступ через <code>group("name")</code>. Регулярные выражения не заменяют полноценную валидацию: ими нельзя надёжно проверить все адреса email, вложенные структуры или бизнес-правила, а шаблоны с вложенными неоднозначными повторениями могут работать очень медленно на недоверенном вводе.</p>


## Примеры кода

### Поиск и извлечение данных: re.findall() и re.search()

Поиск всех email-адресов и телефонов в тексте.

```python
import re

log_entry = "Пользователь user_test@mail.ru оформил заказ №8942 на сумму 15400 руб. Телефон: +7-999-123-45-67."

# re.findall: список всех совпадений
emails = re.findall(r'[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}', log_entry)
numbers = re.findall(r'\d+', log_entry)

print("Найденные email (findall):", emails)
print("Найденные числа (findall):", numbers)

# re.search: первое совпадение с объектом Match
match = re.search(r'№(\d+)', log_entry)
if match:
    print(f"Номер заказа (search group): {match.group(1)}")
```

### Компилированный шаблон, fullmatch и именованные группы

Проверяем всю строку и обращаемся к частям даты по именам.

```python
import re

DATE_PATTERN = re.compile(
    r"(?P<year>\d{4})-(?P<month>0[1-9]|1[0-2])-(?P<day>0[1-9]|[12]\d|3[01])"
)

for value in ("2026-09-06", "2026-09-06 extra", "2026-15-40"):
    match = DATE_PATTERN.fullmatch(value)
    if match:
        print(f"{value}: год {match['year']}, месяц {match['month']}")
    else:
        print(f"{value}: формат не подходит")
```
