import { formatAmount, type CurrencyConfig } from './currencies'

export const formatCurrency = (amount: number, currencyCode?: string, currencies?: CurrencyConfig[]): string => {
    if (currencyCode && currencies && currencies.length > 0) {
        return formatAmount(amount, currencyCode, currencies)
    }
    // Fallback: IRR formatting (backward compat)
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
}

export const formatDate = (date: number | string | Date): string => {
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(date));
}

export const formatDateTime = (date: number | string | Date): string => {
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}
