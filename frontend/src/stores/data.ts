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
    id: number
    transaction_id: number
    change_type: string
    amount: number
    type: string
    description?: string
    date: number
    changed_at: number
    is_deleted: number
}

export const useDataStore = defineStore('data', () => {
    const accounts = ref<Account[]>([])
    const transactions = ref<Transaction[]>([])
    const history = ref<TransactionHistory[]>([])

    async function sync() {
        const { data } = await axios.get(`${API_URL}/sync`)
        accounts.value = data.accounts
        transactions.value = data.transactions
    }

    async function createAccount(name: string, initialBalance: number) {
        await axios.post(`${API_URL}/accounts`, { name, initial_balance: initialBalance })
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

    async function revertTransaction(id: number, historyId: number) {
        await axios.post(`${API_URL}/transactions/${id}/revert`, { history_id: historyId })
        await sync()
        await fetchHistory(id)
    }

    return {
        accounts,
        transactions,
        history,
        sync,
        createAccount,
        deleteAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        fetchHistory,
        revertTransaction
    }
})
