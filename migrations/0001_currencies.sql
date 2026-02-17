-- Migration: Add multi-currency support
-- 1. Create currencies reference table
-- 2. Add currency_code column to accounts

CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimal_digits INTEGER DEFAULT 2,
    rate_to_usd REAL NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
);

ALTER TABLE accounts ADD COLUMN currency_code TEXT DEFAULT 'USD' REFERENCES currencies(code);

-- Pre-fill currencies with approximate rates (base: USD = 1.0)
INSERT INTO currencies (code, name, symbol, decimal_digits, rate_to_usd) VALUES
    ('USD', 'US Dollar', '$', 2, 1.0),
    ('EUR', 'Euro', '€', 2, 1.08),
    ('GBP', 'British Pound', '£', 2, 1.27),
    ('IRR', 'Iranian Rial', 'ریال', 0, 0.000000625),
    ('AED', 'UAE Dirham', 'د.إ', 2, 0.2723),
    ('TRY', 'Turkish Lira', '₺', 2, 0.0309),
    ('CAD', 'Canadian Dollar', 'C$', 2, 0.7407),
    ('AUD', 'Australian Dollar', 'A$', 2, 0.6536),
    ('JPY', 'Japanese Yen', '¥', 0, 0.0067),
    ('CNY', 'Chinese Yuan', '¥', 2, 0.1389),
    ('INR', 'Indian Rupee', '₹', 2, 0.0119),
    ('KRW', 'South Korean Won', '₩', 0, 0.0007),
    ('CHF', 'Swiss Franc', 'CHF', 2, 1.13),
    ('SEK', 'Swedish Krona', 'kr', 2, 0.0952),
    ('SAR', 'Saudi Riyal', '﷼', 2, 0.2667),
    ('QAR', 'Qatari Riyal', '﷼', 2, 0.2747),
    ('KWD', 'Kuwaiti Dinar', 'د.ك', 3, 3.26),
    ('RUB', 'Russian Ruble', '₽', 2, 0.0109),
    ('BRL', 'Brazilian Real', 'R$', 2, 0.1754),
    ('MXN', 'Mexican Peso', 'MX$', 2, 0.0493);
