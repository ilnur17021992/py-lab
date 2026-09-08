---
id: "databases"
title: "БАЗЫ ДАННЫХ И SQL (SQLITE3)"
category: "Базы данных"
tags:
  - "данные"
icon: "🗄️"
summary:
  - "Подключение: import sqlite3; conn = sqlite3.connect(':memory:')"
  - "Выполнение SQL: cursor.execute('CREATE TABLE ...')"
  - "Безопасность (защита от SQLi): cursor.execute('... WHERE id = ?', (user_id,))"
  - "Массовая вставка: cursor.executemany('INSERT INTO ... VALUES (?, ?)', data)"
  - "Получение данных: cursor.fetchone(), cursor.fetchall()"
  - "Доступ по именам колонок: conn.row_factory = sqlite3.Row"
  - "Транзакции: commit() для фиксации или автоматический with conn:"
---

## Теория

<h3>Встроенная база данных SQLite:</h3>
<p>Модуль <code>sqlite3</code> входит в стандартную библиотеку Python и предоставляет полноценную реляционную СУБД с поддержкой SQL и транзакций ACID без необходимости устанавливать отдельный сервер баз данных. База может сохраняться в файл или жить исключительно в оперативной памяти (<code>':memory:'</code>).</p>

<h3>Критическая уязвимость: SQL-инъекции (SQL Injection):</h3>
<p><b>Никогда не подставляйте переменные в SQL-запрос через f-строки или конкатенацию!</b> Это позволяет злоумышленнику внедрить произвольные SQL-команды и украсть или стереть данные.</p>
<ul>
  <li>❌ <b>ОПАСНО:</b> <code>cursor.execute(f"SELECT * FROM users WHERE login = '{user_input}'")</code></li>
  <li>✅ <b>БЕЗОПАСНО:</b> <code>cursor.execute("SELECT * FROM users WHERE login = ?", (user_input,))</code></li>
</ul>

<h3>Транзакции, целостность и индексы</h3>
<p>Используйте <code>with conn:</code> для каждой логически единой операции: при успехе он делает <code>commit()</code>, при исключении — <code>rollback()</code>. В SQLite внешние ключи нужно включать отдельно для каждого подключения: <code>PRAGMA foreign_keys = ON</code>. Ограничения <code>PRIMARY KEY</code>, <code>UNIQUE</code>, <code>NOT NULL</code> и <code>FOREIGN KEY</code> защищают данные; нарушение обрабатывают как <code>sqlite3.IntegrityError</code>. Индекс ускоряет частые условия и соединения, но замедляет запись. Плейсхолдер <code>?</code> предназначен только для значений, а не для имён таблиц, колонок, направлений сортировки или ключевых слов SQL.</p>


## Примеры кода

### Создание таблицы, параметризованная вставка и чтение данных

Безопасная работа с запросами через плейсхолдеры (?) и выборка fetchall().

```python
import sqlite3

# Создаем БД в памяти для тестов
conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

# 1. Создание таблицы пользователей
cursor.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    balance REAL DEFAULT 0.0
)
""")

# 2. Массовая вставка с защитой от SQL-инъекций (executemany)
new_users = [
    ("alice_dev", 1500.50),
    ("bob_admin", 3200.00),
    ("charlie_qa", 850.00)
]
cursor.executemany("INSERT INTO users (username, balance) VALUES (?, ?)", new_users)
conn.commit()

# 3. Безопасная выборка по условию (параметризация через кортеж)
search_min_balance = 1000.0
cursor.execute("SELECT id, username, balance FROM users WHERE balance >= ? ORDER BY balance DESC", (search_min_balance,))
wealthy_users = cursor.fetchall()

print(f"Пользователи с балансом от {search_min_balance} руб.:")
for user_id, uname, balance in wealthy_users:
    print(f" • ID {user_id}: {uname} — {balance:.2f} руб.")
```

### Внешние ключи, ограничения и индекс

Ограничения сохраняют целостность, индекс помогает частой выборке по внешнему ключу.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")
with conn:
    conn.execute("CREATE TABLE customers (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL)")
    conn.execute("""CREATE TABLE orders (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
    )""")
    conn.execute("CREATE INDEX orders_customer_id_idx ON orders(customer_id)")
    conn.execute("INSERT INTO customers (id, email) VALUES (?, ?)", (1, "dev@example.com"))

try:
    with conn:
        conn.execute("INSERT INTO orders (customer_id, total_cents) VALUES (?, ?)", (999, 5000))
except sqlite3.IntegrityError as error:
    print(f"Защита целостности: {error}")
```

### Транзакции и автоматический откат (Rollback) при ошибке

Использование менеджера контекста with conn для защиты целостности данных.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
with conn:
    conn.execute("CREATE TABLE accounts (account_id INT PRIMARY KEY, balance INT)")
    conn.execute("INSERT INTO accounts VALUES (1, 1000), (2, 500)")

def transfer_money(from_id, to_id, amount):
    # Контекстный менеджер with conn фиксирует транзакцию или делает rollback
    try:
        with conn:
            # Списание
            conn.execute("UPDATE accounts SET balance = balance - ? WHERE account_id = ?", (amount, from_id))
            # Имитируем сбой посередине перевода
            if amount > 800:
                raise ValueError("Сработала антифрод-система: перевод заблокирован!")
            # Зачисление
            conn.execute("UPDATE accounts SET balance = balance + ? WHERE account_id = ?", (amount, to_id))
            print(f"✅ Успешный перевод {amount} руб.")
    except Exception as e:
        print(f"❌ Ошибка транзакции ({e}). Балансы сохранены и откачены!")

# Попытка некорректного перевода
transfer_money(1, 2, 900)

# Проверяем, что баланс счета 1 не уменьшился (транзакция откатилась)
cur = conn.cursor()
cur.execute("SELECT account_id, balance FROM accounts")
print("Состояние счетов после отката:", cur.fetchall())
```