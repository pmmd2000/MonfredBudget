DROP TABLE IF EXISTS transaction_history;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, -- Link to User
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    amount REAL DEFAULT 0,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) DEFAULT 'EXPENSE',
    description TEXT,
    date INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    account_id INTEGER,
    amount REAL,
    type TEXT,
    description TEXT,
    date INTEGER,
    is_deleted INTEGER,
    change_type TEXT CHECK(change_type IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')),
    changed_at INTEGER DEFAULT (unixepoch()),
    is_overwritten INTEGER DEFAULT 0,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
