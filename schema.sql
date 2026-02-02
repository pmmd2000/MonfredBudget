DROP TABLE IF EXISTS transactions;

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    deposit_amount INTEGER DEFAULT 0,
    withdrawal_amount INTEGER DEFAULT 0,
    transaction_date INTEGER NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);
