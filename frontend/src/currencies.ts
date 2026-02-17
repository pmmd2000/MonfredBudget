// Currency formatting and conversion utilities

export interface CurrencyConfig {
    code: string
    name: string
    symbol: string
    decimal_digits: number
    rate_to_usd: number
}

/**
 * Format an amount with proper symbol, decimal places, and delimiters
 * for the given currency.
 */
export function formatAmount(amount: number, currencyCode: string, currencies: CurrencyConfig[]): string {
    const currency = currencies.find(c => c.code === currencyCode)
    if (!currency) {
        // Fallback: IRR-style formatting
        return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال'
    }

    const absAmount = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''

    if (currencyCode === 'IRR') {
        // Special IRR formatting: Persian digits, 3-digit delimiter, no decimals, ریال suffix
        return sign + new Intl.NumberFormat('fa-IR', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(absAmount) + ' ریال'
    }

    // For other currencies, use standard formatting
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: currency.decimal_digits,
        maximumFractionDigits: currency.decimal_digits
    }).format(absAmount)

    // Place symbol before or after based on convention
    // Most currencies use prefix symbol
    return sign + currency.symbol + formatted
}

/**
 * Convert an amount from one currency to another via USD cross-rate.
 * Formula: converted = amount × (source_rate_to_usd / target_rate_to_usd)
 */
export function convertAmount(
    amount: number,
    fromCode: string,
    toCode: string,
    currencies: CurrencyConfig[]
): number {
    if (fromCode === toCode) return amount

    const fromCurrency = currencies.find(c => c.code === fromCode)
    const toCurrency = currencies.find(c => c.code === toCode)

    if (!fromCurrency || !toCurrency) return amount

    return amount * (fromCurrency.rate_to_usd / toCurrency.rate_to_usd)
}

/**
 * Get the currency symbol for display
 */
export function getCurrencySymbol(currencyCode: string, currencies: CurrencyConfig[]): string {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency ? currency.symbol : currencyCode
}

/**
 * Get the number of decimal digits for a currency
 */
export function getCurrencyDecimals(currencyCode: string, currencies: CurrencyConfig[]): number {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency ? currency.decimal_digits : 2
}
