// js/data/pythonDocs.js - Справочник ключевых слов, встроенных функций и методов Python для Hover Tooltips
export const PYTHON_DOCS = {
  // =========================================================================
  // 1. Все 35 ключевых слов Python 3.12 (Keywords)
  // =========================================================================
  False: {
    signature: "False: bool",
    description: "Логическая константа «Ложь». Имеет тип bool и числовой эквивалент 0 в арифметических операциях.",
    example: 'is_active = False'
  },
  True: {
    signature: "True: bool",
    description: "Логическая константа «Истина». Имеет тип bool и числовой эквивалент 1 в арифметических операциях.",
    example: 'is_ready = True'
  },
  None: {
    signature: "None: NoneType",
    description: "Специальная константа, обозначающая отсутствие значения или пустой результат. Функции без явного return возвращают None. Проверяется через оператор `is None`.",
    example: 'result = None\nif result is None:\n    print("Значение не задано")'
  },
  and: {
    signature: "x and y",
    description: "Логический оператор «И». Вычисляет аргументы «лениво»: возвращает первое ложное значение или последний операнд, если все истинны.",
    example: 'if x > 0 and y > 0:\n    print("Оба числа положительные")'
  },
  or: {
    signature: "x or y",
    description: "Логический оператор «ИЛИ». Вычисляет аргументы «лениво»: возвращает первое истинное значение или последний операнд, если все ложны.",
    example: 'name = user_input or "Аноним"'
  },
  not: {
    signature: "not x -> bool",
    description: "Логическое отрицание «НЕ». Инвертирует логическое значение: `not True` даёт `False`, а `not False` даёт `True`.",
    example: 'if not users:\n    print("Список пуст")'
  },
  if: {
    signature: "if condition:",
    description: "Основной оператор ветвления. Выполняет вложенный блок кода, только если условие истинно.",
    example: 'if score >= 90:\n    print("Отлично!")'
  },
  elif: {
    signature: "elif condition:",
    description: "Сокращение от «else if». Проверяет альтернативное условие, если предыдущие блоки `if` или `elif` оказались ложными.",
    example: 'if x > 0:\n    print("+")\nelif x < 0:\n    print("-")'
  },
  else: {
    signature: "else:",
    description: "Ветка «иначе»:\n• В условиях `if`: срабатывает, если ни одно условие не подошло.\n• В циклах `for` / `while`: срабатывает, если цикл завершился штатно (без прерывания по `break`).\n• В `try/except`: срабатывает, если исключений НЕ возникло.",
    example: 'for x in [1, 2]:\n    pass\nelse:\n    print("Цикл завершился без break!")'
  },
  while: {
    signature: "while condition:",
    description: "Цикл с предусловием. Повторяет блок кода до тех пор, пока условие остаётся истинным. Поддерживает `break`, `continue` и ветку `else`.",
    example: 'count = 0\nwhile count < 3:\n    print(count)\n    count += 1'
  },
  for: {
    signature: "for target in iterable:",
    description: "Цикл обхода последовательностей и итераторов (списки, строки, словари, range). На каждой итерации извлекает следующий элемент.",
    example: 'for item in ["яблоко", "банан"]:\n    print(item)'
  },
  break: {
    signature: "break",
    description: "Досрочно прерывает выполнение ближайшего объемлющего цикла `for` или `while`. Ветка `else` цикла при этом пропускается.",
    example: 'while True:\n    line = input()\n    if line == "stop":\n        break'
  },
  continue: {
    signature: "continue",
    description: "Немедленно завершает текущую итерацию цикла и переходит к следующей итерации (проверке условия в while или следующему элементу в for).",
    example: 'for i in range(5):\n    if i % 2 == 0:\n        continue  # пропускаем четные\n    print(i)'
  },
  pass: {
    signature: "pass",
    description: "Пустая операция-заглушка (no-op). Используется в местах, где синтаксис Python требует блок кода, но никаких действий совершать не нужно.",
    example: 'def todo_function():\n    pass  # реализуем позже'
  },
  def: {
    signature: "def name(parameters) -> return_type:",
    description: "Определяет новую пользовательскую функцию или метод класса.",
    example: 'def greet(name: str) -> str:\n    return f"Привет, {name}!"'
  },
  return: {
    signature: "return [expression]",
    description: "Завершает выполнение функции и возвращает значение вызывающей стороне. Если выражение опущено, возвращает `None`.",
    example: 'def square(n):\n    return n * n'
  },
  yield: {
    signature: "yield [expression]",
    description: "Превращает функцию в генератор. Приостанавливает выполнение функции, возвращая значение вызывающей стороне, сохраняя локальное состояние для следующего вызова `next()`.",
    example: 'def count_up(n):\n    for i in range(n):\n        yield i'
  },
  class: {
    signature: "class Name[(BaseClass)]:",
    description: "Определяет новый класс (шаблон создания объектов) с поддержкой наследования и инкапсуляции методов.",
    example: 'class User:\n    def __init__(self, name):\n        self.name = name'
  },
  lambda: {
    signature: "lambda arguments: expression",
    description: "Создает компактную анонимную однострочную функцию без явной инструкции `return`.",
    example: 'square = lambda x: x ** 2\nprint(square(5))  # 25'
  },
  try: {
    signature: "try:",
    description: "Открывает блок защищенного кода для перехвата и обработки возможных ошибок и исключений.",
    example: 'try:\n    res = 10 / 0\nexcept ZeroDivisionError:\n    print("Деление на ноль!")'
  },
  except: {
    signature: "except [ExceptionType [as variable]]:",
    description: "Блок перехвата ошибки в конструкции `try/except`. Срабатывает при возникновении указанного типа исключения.",
    example: 'try:\n    int("abc")\nexcept ValueError as err:\n    print("Ошибка формата:", err)'
  },
  finally: {
    signature: "finally:",
    description: "Блок очистки ресурсов в `try`. Выполняется **ВСЕГДА**, независимо от того, возникла ошибка или нет, и был ли выполнен `return`.",
    example: 'try:\n    f = open("file.txt")\nfinally:\n    f.close()  # закроется в любом случае'
  },
  raise: {
    signature: "raise [exception_instance]",
    description: "Принудительно вызывает (возбуждает) исключение, прерывая нормальный поток выполнения программы.",
    example: 'if age < 0:\n    raise ValueError("Возраст не может быть отрицательным")'
  },
  assert: {
    signature: "assert condition[, message]",
    description: "Инструкция утверждения для проверки условий во время отладки и тестов. Если условие ложно, вызывает `AssertionError` с переданным сообщением.",
    example: 'assert x > 0, "Число должно быть положительным"'
  },
  with: {
    signature: "with context_manager [as target]:",
    description: "Менеджер контекста. Автоматизирует настройку и очистку ресурсов (автоматическое закрытие файлов, освобождение блокировок через `__enter__` и `__exit__`).",
    example: 'with open("data.txt", "w") as f:\n    f.write("test")  # файл закроется сам'
  },
  as: {
    signature: "... as alias",
    description: "Связывает объект с псевдонимом или локальной переменной:\n• В `import math as m`\n• В `with open(...) as f`\n• В `except ValueError as err`",
    example: 'import json as j\nwith open("conf.json") as f:\n    pass'
  },
  import: {
    signature: "import module [as alias]",
    description: "Загружает внешний модуль или библиотеку в текущее пространство имён программы.",
    example: 'import sys\nimport math as m'
  },
  from: {
    signature: "from module import object [as alias]",
    description: "Импортирует конкретные функции, классы или переменные из указанного модуля.",
    example: 'from datetime import datetime, timedelta'
  },
  in: {
    signature: "x in sequence",
    description: "Оператор проверки принадлежности (`'a' in 'cat'`) либо связующее слово в цикле `for item in collection`.",
    example: 'if "admin" in user_roles:\n    print("Доступ разрешен")'
  },
  is: {
    signature: "x is y",
    description: "Оператор проверки идентичности объектов. Проверяет, указывают ли две переменные на **один и тот же адрес в памяти** (`id(x) == id(y)`). Рекомендуется для сравнения с `None`, `True`, `False`.",
    example: 'if val is None:\n    print("Пусто")'
  },
  del: {
    signature: "del target",
    description: "Удаляет переменную из области видимости, элемент из списка по индексу или пару ключ/значение из словаря.",
    example: 'd = {"a": 1, "b": 2}\ndel d["a"]\nlst = [10, 20]; del lst[0]'
  },
  global: {
    signature: "global variable",
    description: "Указывает, что переменная внутри функции должна браться из глобальной области видимости модуля, позволяя изменять её значение.",
    example: 'total = 0\ndef add(n):\n    global total\n    total += n'
  },
  nonlocal: {
    signature: "nonlocal variable",
    description: "Указывает, что переменная принадлежит внешней (объемлющей), но не глобальной функции (используется во вложенных замыканиях).",
    example: 'def outer():\n    count = 0\n    def inner():\n        nonlocal count\n        count += 1'
  },
  async: {
    signature: "async def / async with / async for",
    description: "Объявляет асинхронную функцию (корутину), асинхронный менеджер контекста или асинхронный цикл для работы с Event Loop (asyncio).",
    example: 'async def fetch_data():\n    await asyncio.sleep(1)'
  },
  await: {
    signature: "await awaitable_object",
    description: "Приостанавливает выполнение текущей асинхронной корутины до завершения переданной задачи/корутины, освобождая поток для других задач.",
    example: 'data = await fetch_url("https://api.site.com")'
  },

  // =========================================================================
  // 2. Встроенные функции Python (Built-ins)
  // =========================================================================
  repr: {
    signature: "repr(object) -> str",
    description: "Возвращает техническое («каноническое») строковое представление объекта со всеми кавычками и спецсимволами (\\n, \\t, пробелами). Незаменима при отладке, чтобы увидеть реальное содержимое строк и объектов.",
    example: 'raw = " hello\\n "\nprint(repr(raw))  # \' hello\\n \''
  },
  print: {
    signature: "print(*objects, sep=' ', end='\\n', file=None, flush=False)",
    description: "Выводит объекты в текстовый поток (терминал / консоль), разделяя их строкой `sep` и завершая строкой `end`.",
    example: 'print("Привет", "мир!", sep=", ")'
  },
  input: {
    signature: "input(prompt='') -> str",
    description: "Считывает строку со стандартного ввода (от пользователя) и возвращает её в виде строки `str`.",
    example: 'name = input("Ваше имя: ")'
  },
  len: {
    signature: "len(s) -> int",
    description: "Возвращает количество элементов в последовательности (строка, список, кортеж) или коллекции (словарь, множество).",
    example: 'len("Python")  # 6\nlen([1, 2, 3])  # 3'
  },
  type: {
    signature: "type(object) -> type",
    description: "Возвращает тип переданного объекта.",
    example: 'type(42)  # <class \'int\'>\ntype("текст")  # <class \'str\'>'
  },
  isinstance: {
    signature: "isinstance(object, classinfo) -> bool",
    description: "Проверяет, является ли объект экземпляром указанного класса или кортежа классов.",
    example: 'isinstance(42, int)  # True\nisinstance("hello", (int, str))  # True'
  },
  id: {
    signature: "id(object) -> int",
    description: "Возвращает уникальный целочисленный идентификатор объекта (фактически адрес в памяти в CPython).",
    example: 'x = [1, 2]; id(x)'
  },
  help: {
    signature: "help([object])",
    description: "Вызывает встроенную справочную систему Python по объекту, модулю или функции.",
    example: 'help(str.split)'
  },
  dir: {
    signature: "dir([object]) -> list[str]",
    description: "Возвращает список доступных атрибутов и методов переданного объекта.",
    example: 'dir("")  # список методов строки'
  },
  int: {
    signature: "int(x=0, base=10) -> int",
    description: "Преобразует число или строку к целому числу. Позволяет задать систему счисления `base`.",
    example: 'int("42")  # 42\nint("1010", 2)  # 10'
  },
  float: {
    signature: "float(x=0.0) -> float",
    description: "Преобразует число или строку в число с плавающей точкой.",
    example: 'float("3.14")  # 3.14'
  },
  str: {
    signature: "str(object='') -> str",
    description: "Возвращает понятное пользователю строковое представление объекта.",
    example: 'str(100)  # "100"'
  },
  bool: {
    signature: "bool(x=False) -> bool",
    description: "Возвращает True или False. Пустые коллекции (0, '', [], {}, None) дают False, остальные — True.",
    example: 'bool([])  # False\nbool("текст")  # True'
  },
  list: {
    signature: "list([iterable]) -> list",
    description: "Создает новый изменяемый список из итерируемого объекта.",
    example: 'list("abc")  # [\'a\', \'b\', \'c\']'
  },
  tuple: {
    signature: "tuple([iterable]) -> tuple",
    description: "Создает новый неизменяемый кортеж.",
    example: 'tuple([1, 2, 3])  # (1, 2, 3)'
  },
  set: {
    signature: "set([iterable]) -> set",
    description: "Создает изменяемое множество уникальных элементов.",
    example: 'set([1, 2, 2, 3])  # {1, 2, 3}'
  },
  dict: {
    signature: "dict(**kwargs) / dict(mapping) -> dict",
    description: "Создает новый словарь ключ-значение.",
    example: 'dict(name="Alice", age=25)'
  },
  sum: {
    signature: "sum(iterable, /, start=0) -> number",
    description: "Суммирует все элементы итерируемого объекта слева направо.",
    example: 'sum([1, 2, 3, 4])  # 10'
  },
  min: {
    signature: "min(*args, key=None) -> item",
    description: "Возвращает наименьший элемент из последовательности или аргументов.",
    example: 'min(5, 2, 9)  # 2'
  },
  max: {
    signature: "max(*args, key=None) -> item",
    description: "Возвращает наибольший элемент из последовательности или аргументов.",
    example: 'max(5, 2, 9)  # 9'
  },
  abs: {
    signature: "abs(x) -> number",
    description: "Возвращает абсолютное значение (модуль) числа.",
    example: 'abs(-42)  # 42'
  },
  round: {
    signature: "round(number, ndigits=None) -> number",
    description: "Округляет число до указанного количества знаков после запятой.",
    example: 'round(3.14159, 2)  # 3.14'
  },
  range: {
    signature: "range(stop) / range(start, stop[, step])",
    description: "Генерирует неизменяемую последовательность целых чисел от `start` до `stop` (не включая) с шагом `step`.",
    example: 'list(range(5))  # [0, 1, 2, 3, 4]'
  },
  enumerate: {
    signature: "enumerate(iterable, start=0) -> iterator",
    description: "Возвращает итератор кортежей вида `(индекс, элемент)`, начиная с `start`.",
    example: 'for i, val in enumerate(["a", "b"]): print(i, val)'
  },
  zip: {
    signature: "zip(*iterables, strict=False) -> iterator",
    description: "Объединяет элементы из нескольких последовательностей в кортежи поэлементно.",
    example: 'list(zip([1, 2], ["a", "b"]))  # [(1, \'a\'), (2, \'b\')]'
  },
  sorted: {
    signature: "sorted(iterable, /, *, key=None, reverse=False) -> list",
    description: "Возвращает новый отсортированный список из элементов переданного итерируемого объекта.",
    example: 'sorted([3, 1, 2])  # [1, 2, 3]'
  },
  reversed: {
    signature: "reversed(sequence) -> iterator",
    description: "Возвращает обратный итератор по элементам последовательности.",
    example: 'list(reversed([1, 2, 3]))  # [3, 2, 1]'
  },
  any: {
    signature: "any(iterable) -> bool",
    description: "Возвращает True, если хотя бы один элемент коллекции истинен.",
    example: 'any([False, 0, 5])  # True'
  },
  all: {
    signature: "all(iterable) -> bool",
    description: "Возвращает True, если абсолютно все элементы коллекции истинны (или коллекция пуста).",
    example: 'all([True, 1, "ok"])  # True'
  },
  map: {
    signature: "map(func, *iterables) -> iterator",
    description: "Применяет функцию `func` к каждому элементу переданных последовательностей.",
    example: 'list(map(int, ["1", "2"]))  # [1, 2]'
  },
  filter: {
    signature: "filter(func, iterable) -> iterator",
    description: "Фильтрует элементы итерируемого объекта, оставляя только те, для которых `func(item)` истинна.",
    example: 'list(filter(lambda x: x > 0, [-1, 2, -3, 4]))  # [2, 4]'
  },
  open: {
    signature: "open(file, mode='r', encoding=None) -> file object",
    description: "Открывает файл и возвращает соответствующий файловый поток. Режимы: 'r' (чтение), 'w' (запись), 'a' (добавление).",
    example: 'with open("data.txt", "w", encoding="utf-8") as f:\n    f.write("test")'
  },

  // =========================================================================
  // 3. Популярные методы строк и коллекций
  // =========================================================================
  strip: {
    signature: "str.strip([chars]) -> str",
    description: "Удаляет пробельные символы (пробелы, табы, \\n) или указанные `chars` с обоих концов строки.",
    example: '"  hello \\n ".strip()  # "hello"'
  },
  lstrip: {
    signature: "str.lstrip([chars]) -> str",
    description: "Удаляет пробельные символы или указанные `chars` только с левого конца (начала) строки.",
    example: '"   test".lstrip()  # "test"'
  },
  rstrip: {
    signature: "str.rstrip([chars]) -> str",
    description: "Удаляет пробельные символы или указанные `chars` только с правого конца (хвоста) строки.",
    example: '"test   ".rstrip()  # "test"'
  },
  lower: {
    signature: "str.lower() -> str",
    description: "Возвращает копию строки, преобразованную в нижний регистр (все буквы строчные).",
    example: '"USER@EXAMPLE.COM".lower()  # "user@example.com"'
  },
  upper: {
    signature: "str.upper() -> str",
    description: "Возвращает копию строки, преобразованную в верхний регистр (все буквы заглавные).",
    example: '"hello".upper()  # "HELLO"'
  },
  title: {
    signature: "str.title() -> str",
    description: "Преобразует первое слово и все последующие слова строки к заглавной букве.",
    example: '"python interactive lab".title()  # "Python Interactive Lab"'
  },
  capitalize: {
    signature: "str.capitalize() -> str",
    description: "Делает заглавной только самую первую букву всей строки, остальные — строчными.",
    example: '"hello world".capitalize()  # "Hello world"'
  },
  split: {
    signature: "str.split(sep=None, maxsplit=-1) -> list[str]",
    description: "Разбивает строку на список подстрок по разделителю `sep` (по умолчанию по любым пробелам).",
    example: '"apple,banana,orange".split(",")  # [\'apple\', \'banana\', \'orange\']'
  },
  join: {
    signature: "str.join(iterable) -> str",
    description: "Склеивает элементы переданной последовательности строк через текущую строку-разделитель.",
    example: '", ".join(["a", "b", "c"])  # "a, b, c"'
  },
  replace: {
    signature: "str.replace(old, new[, count]) -> str",
    description: "Возвращает копию строки, где все (или первые `count`) вхождения `old` заменены на `new`.",
    example: '"hello world".replace("world", "Python")  # "hello Python"'
  },
  startswith: {
    signature: "str.startswith(prefix[, start[, end]]) -> bool",
    description: "Проверяет, начинается ли строка с указанного префикса `prefix`.",
    example: '"https://site.com".startswith("https://")  # True'
  },
  endswith: {
    signature: "str.endswith(suffix[, start[, end]]) -> bool",
    description: "Проверяет, оканчивается ли строка указанным суффиксом `suffix`.",
    example: '"file.py".endswith(".py")  # True'
  },
  find: {
    signature: "str.find(sub[, start[, end]]) -> int",
    description: "Возвращает наименьший индекс подстроки `sub` в строке. Если подстрока не найдена, возвращает -1.",
    example: '"abcdef".find("cd")  # 2'
  },
  count: {
    signature: "str.count(sub[, start[, end]]) -> int",
    description: "Возвращает количество неперекрывающихся вхождений подстроки `sub` в строку или элементов в списке.",
    example: '"banana".count("a")  # 3'
  },
  append: {
    signature: "list.append(object) -> None",
    description: "Добавляет элемент `object` в самый конец текущего списка (изменяет список на месте).",
    example: 'lst = [1, 2]; lst.append(3)  # [1, 2, 3]'
  },
  extend: {
    signature: "list.extend(iterable) -> None",
    description: "Расширяет список, добавляя в конец все элементы из переданного итерируемого объекта.",
    example: 'lst = [1]; lst.extend([2, 3])  # [1, 2, 3]'
  },
  insert: {
    signature: "list.insert(index, object) -> None",
    description: "Вставляет элемент `object` перед указанным индексом `index`.",
    example: 'lst = [1, 3]; lst.insert(1, 2)  # [1, 2, 3]'
  },
  pop: {
    signature: "list.pop([index]) -> item",
    description: "Удаляет и возвращает элемент по указанному индексу (по умолчанию — самый последний).",
    example: 'lst = [1, 2, 3]; x = lst.pop()  # x = 3, lst = [1, 2]'
  },
  remove: {
    signature: "list.remove(value) -> None",
    description: "Удаляет первое найденное вхождение `value` из списка. Если элемент не найден — вызывает ValueError.",
    example: 'lst = ["a", "b", "a"]; lst.remove("a")  # [\'b\', \'a\']'
  },
  sort: {
    signature: "list.sort(*, key=None, reverse=False) -> None",
    description: "Сортирует элементы списка на месте (in-place) в порядке возрастания или убывания.",
    example: 'lst = [3, 1, 2]; lst.sort()  # [1, 2, 3]'
  },
  get: {
    signature: "dict.get(key[, default]) -> value",
    description: "Безопасно возвращает значение по ключу `key`. Если ключ отсутствует, возвращает `default` (или None) без ошибки KeyError.",
    example: 'user = {"name": "Alice"}; age = user.get("age", 18)'
  },
  keys: {
    signature: "dict.keys() -> dict_keys",
    description: "Возвращает динамическое представление (view) всех ключей словаря.",
    example: 'user.keys()'
  },
  values: {
    signature: "dict.values() -> dict_values",
    description: "Возвращает динамическое представление (view) всех значений словаря.",
    example: 'user.values()'
  },
  items: {
    signature: "dict.items() -> dict_items",
    description: "Возвращает динамическое представление пар `(ключ, значение)` словаря для удобного обхода в цикле `for k, v in d.items()`.",
    example: 'for k, v in {"a": 1}.items(): print(k, v)'
  },
  update: {
    signature: "dict.update([other]) -> None",
    description: "Обновляет словарь парами ключ/значение из другого словаря или итерируемого объекта.",
    example: 'd = {"a": 1}; d.update({"b": 2})'
  }
};

/**
 * Получает объект документации по слову (функции, методу, ключевому слову).
 * @param {string} word
 * @returns {{ signature: string, description: string, example?: string } | null}
 */
export function getPythonDoc(word) {
  if (!word || typeof word !== 'string') return null;
  const key = word.trim();
  return PYTHON_DOCS[key] || null;
}

/**
 * Формирует массив MarkdownString объектов для Monaco Hover Provider.
 * @param {string} word
 * @returns {Array<{ value: string }> | null}
 */
export function getHoverContents(word) {
  const doc = getPythonDoc(word);
  if (!doc) return null;

  const contents = [
    { value: `**\`${doc.signature}\`**` },
    { value: doc.description }
  ];

  if (doc.example) {
    contents.push({ value: `\`\`\`python\n${doc.example}\n\`\`\`` });
  }

  return contents;
}
