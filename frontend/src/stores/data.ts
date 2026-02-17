import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { CurrencyConfig } from '../currencies'

const API_URL = '/api'

export interface Account {
    id: number
    name: string
    balance: number
    currency_code: string
    created_at: number
}

export interface Transaction {
    id: number
    account_id: number
    amount: number
    type: 'INCOME' | 'EXPENSE'
    description?: string
    date: number
    created_at: number
}

export interface TransactionHistory {
    history_id: number
    id: number
    transaction_id: number
    change_type: string
    amount: number
    type: string
    description?: string
    date: number
    changed_at: number
    is_deleted: number
    is_overwritten?: number
    account_name?: string
}

export const useDataStore = defineStore('data', () => {
    const accounts = ref<Account[]>([])
    const transactions = ref<Transaction[]>([])
    const currencies = ref<CurrencyConfig[]>([])
    const history = ref<TransactionHistory[]>([])
    const globalHistory = ref<(TransactionHistory & { account_name?: string })[]>([])

    // Most used currency across all accounts (mode)
    const mostUsedCurrency = computed(() => {
        if (accounts.value.length === 0) return 'IRR'
        const counts: Record<string, number> = {}
        for (const acc of accounts.value) {
            const code = acc.currency_code || 'IRR'
            counts[code] = (counts[code] || 0) + 1
        }
        let maxCode = 'IRR'
        let maxCount = 0
        for (const [code, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count
                maxCode = code
            }
        }
        return maxCode
    })

    async function sync() {
        const { data } = await axios.get(`${API_URL}/sync`)
        accounts.value = data.accounts
        transactions.value = data.transactions
        if (data.currencies) {
            currencies.value = data.currencies
        }
    }

    async function createAccount(name: string, currencyCode: string = 'IRR') {
        await axios.post(`${API_URL}/accounts`, { name, currency_code: currencyCode })
        await sync()
    }

    async function deleteAccount(id: number) {
        await axios.delete(`${API_URL}/accounts/${id}`)
        await sync()
    }

    async function createTransaction(tx: Partial<Transaction>) {
        await axios.post(`${API_URL}/transactions`, tx)
        await sync()
    }

    async function updateTransaction(id: number, tx: Partial<Transaction>) {
        await axios.put(`${API_URL}/transactions/${id}`, tx)
        await sync()
    }

    async function deleteTransaction(id: number) {
        await axios.delete(`${API_URL}/transactions/${id}`)
        await sync()
    }

    async function fetchHistory(id: number) {
        const { data } = await axios.get(`${API_URL}/transactions/${id}/history`)
        history.value = data
    }

    async function fetchGlobalHistory(cursor?: number) {
        try {
            const url = cursor ? `${API_URL}/history?cursor=${cursor}` : `${API_URL}/history`
            const { data } = await axios.get<TransactionHistory[]>(url)

            if (cursor) {
                globalHistory.value.push(...data)
            } else {
                globalHistory.value = data
            }
        } catch (error) {
            console.error('Failed to fetch global history:', error)
        }
    }

    async function revertTransaction(id: number, historyId: number) {
        await axios.post(`${API_URL}/transactions/${id}/revert`, { history_id: historyId })
        await sync()
        await fetchHistory(id)
        await fetchGlobalHistory()
    }

    async function rollbackToHistory(historyId: number) {
        await axios.post(`${API_URL}/history/rollback`, { target_history_id: historyId })
        await sync()
        await fetchGlobalHistory()
    }

    // Helper: get currency code for an account
    function getAccountCurrency(accountId: number): string {
        const acc = accounts.value.find(a => a.id === accountId)
        return acc?.currency_code || 'IRR'
    }

    return {
        accounts,
        transactions,
        currencies,
        history,
        globalHistory,
        mostUsedCurrency,
        sync,
        createAccount,
        deleteAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        fetchHistory,
        fetchGlobalHistory,
        revertTransaction,
        rollbackToHistory,
        getAccountCurrency
    }
})
