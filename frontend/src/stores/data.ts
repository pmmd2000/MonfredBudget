import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const API_URL = '/api'

export interface Account {
    id: number
    name: string
    balance: number
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
    const history = ref<TransactionHistory[]>([])
    const globalHistory = ref<(TransactionHistory & { account_name?: string })[]>([])

    async function sync() {
        const { data } = await axios.get(`${API_URL}/sync`)
        accounts.value = data.accounts
        transactions.value = data.transactions
    }

    async function createAccount(name: string) {
        await axios.post(`${API_URL}/accounts`, { name })
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

    return {
        accounts,
        transactions,
        history,
        globalHistory,
        sync,
        createAccount,
        deleteAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        fetchHistory,
        fetchGlobalHistory,
        revertTransaction,
        rollbackToHistory
    }
})
