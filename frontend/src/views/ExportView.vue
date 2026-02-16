<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDataStore } from '../stores/data'
import { formatCurrency, formatDate, formatDateTime } from '../utils'

const store = useDataStore()
const route = useRoute()
const limit = Number(route.query.limit) || 1000
const accountId = route.query.accountId ? Number(route.query.accountId) : null

const now = ref(Date.now())

onMounted(async () => {
    await store.sync()
    setTimeout(() => {
        window.print()
    }, 1000)
})

const filteredTransactions = computed(() => {
    let txs = store.transactions
    if (accountId) {
        txs = txs.filter(t => t.account_id === accountId)
    }
    return txs.slice(0, limit)
})

const currentAccountName = computed(() => {
    if (!accountId) return 'همه حساب‌ها'
    const acc = store.accounts.find(a => a.id === accountId)
    return acc ? acc.name : 'Unknown Account'
})

const totalIncome = computed(() => filteredTransactions.value.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0))
const totalExpense = computed(() => filteredTransactions.value.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value)
</script>

<template>
    <div class="p-8 bg-white text-black min-h-screen font-sans" dir="rtl">
        <div class="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
            <div>
                <h1 class="text-2xl font-bold">گزارش تراکنش‌ها</h1>
                <p class="text-sm mt-1">تاریخ گزارش: {{ formatDateTime(now) }}</p>
                <p class="text-sm mt-1">حساب: <strong>{{ currentAccountName }}</strong></p>
            </div>
            <div class="text-left">
                <div class="text-xl font-bold">مهرداد اپ</div>
                <div class="text-sm">مدیریت مالی شخصی</div>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="border border-black p-4 text-center">
                <div class="text-sm text-gray-600">مجموع درآمد</div>
                <div class="text-xl font-bold text-green-700">{{ formatCurrency(totalIncome) }} ریال</div>
            </div>
             <div class="border border-black p-4 text-center">
                <div class="text-sm text-gray-600">مجموع هزینه</div>
                <div class="text-xl font-bold text-red-700">{{ formatCurrency(totalExpense) }} ریال</div>
            </div>
             <div class="border border-black p-4 text-center">
                <div class="text-sm text-gray-600">تراز</div>
                <div class="text-xl font-bold" :class="netBalance >= 0 ? 'text-blue-700' : 'text-red-700'">{{ formatCurrency(netBalance) }} ریال</div>
            </div>
        </div>

        <table class="w-full border-collapse border border-black mb-8 text-sm">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border border-black p-2 text-right">تاریخ</th>
                    <th class="border border-black p-2 text-right">توضیحات</th>
                    <th class="border border-black p-2 text-right">نوع</th>
                    <th class="border border-black p-2 text-right">مبلغ (ریال)</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="tx in filteredTransactions" :key="tx.id">
                    <td class="border border-black p-2">{{ formatDate(tx.date) }}</td>
                    <td class="border border-black p-2">{{ tx.description || '-' }}</td>
                    <td class="border border-black p-2">{{ tx.type === 'INCOME' ? 'درآمد' : 'هزینه' }}</td>
                    <td class="border border-black p-2" dir="ltr" :class="tx.type === 'INCOME' ? 'text-green-700' : 'text-red-700'">
                        {{ formatCurrency(tx.amount) }}
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="text-center text-xs text-gray-500 mt-12">
            این سند به صورت خودکار تولید شده است.
        </div>
    </div>
</template>

<style scoped>
@media print {
    body {
        background: white;
    }
}
</style>
