---
id: "cli_argparse"
title: "КОМАНДНАЯ СТРОКА (ARGPARSE)"
category: "Инструменты"
tags:
  - "инструменты"
  - "модули"
icon: "🖥️"
summary:
  - "ArgumentParser описывает интерфейс команды и справку"
  - "Позиционные аргументы, флаги, типы и choices проверяются до запуска логики"
  - "main(argv) делает CLI удобным для тестирования"
  - "Код возврата передаётся через SystemExit"
---

## Теория

<h3>Интерфейс командной строки</h3>
<p>Модуль <code>argparse</code> входит в стандартную библиотеку и создаёт интерфейс командной строки: справку, обязательные аргументы, значения по умолчанию и сообщения об ошибках. Парсер должен находиться на границе приложения: после разбора аргументов передавайте обычные Python-значения в бизнес-логику.</p>

<h3>Тестируемая точка входа</h3>
<p>Функция <code>main(argv: list[str] | None = None) -&gt; int</code> получает аргументы явно и возвращает код результата. При обычном запуске <code>SystemExit(main())</code> передаёт этот код оболочке. В тесте можно вызвать <code>main(["..."])</code> без изменения глобального <code>sys.argv</code>.</p>

<h3>Безопасные ожидания</h3>
<p><code>type=Path</code> преобразует текст в путь, но не проверяет существование файла и не делает путь безопасным сам по себе. Проверяйте доступ к файловой системе отдельно. Не выводите секреты в аргументы командной строки: они могут попасть в историю оболочки и список процессов.</p>

## Примеры кода

### Позиционный аргумент и флаги

Парсер проверяет допустимый формат и передаёт уже подготовленные значения в функцию.

```python
import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Печатает приветствие")
    parser.add_argument("name")
    parser.add_argument("--times", type=int, default=1)
    parser.add_argument("--style", choices=("short", "formal"), default="short")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)

    if args.times < 1:
        parser.error("--times должен быть положительным")

    greeting = f"Здравствуйте, {args.name}!" if args.style == "formal" else f"Привет, {args.name}!"
    text = "\n".join([greeting] * args.times)
    if args.output is None:
        print(text)
    else:
        args.output.write_text(text + "\n", encoding="utf-8")
    return 0

main(["Анна", "--times", "2", "--style", "formal"])
```

### Подкоманды

Подкоманды подходят, когда утилита выполняет несколько независимых действий.

```python
import argparse


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="notes")
    commands = parser.add_subparsers(dest="command", required=True)

    add = commands.add_parser("add")
    add.add_argument("text")
    commands.add_parser("list")

    args = parser.parse_args(argv)
    if args.command == "add":
        print(f"Добавлена заметка: {args.text}")
    else:
        print("Список заметок пуст")
    return 0

main(["add", "Купить молоко"])
main(["list"])
```

### Запуск как программы

Этот блок размещают в конце файла CLI; при импорте в тесты он не выполняется.

```python
def main(argv: list[str] | None = None) -> int:
    print(f"Получены аргументы: {argv or []}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```