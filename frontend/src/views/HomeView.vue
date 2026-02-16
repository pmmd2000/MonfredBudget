<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { formatCurrency, formatDate } from '../utils'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Toolbar from 'primevue/toolbar'
import Drawer from 'primevue/drawer'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'

const store = useDataStore()
const auth = useAuthStore()
const router = useRouter()

const showAccountDrawer = ref(false)
const showAccountDialog = ref(false)
const showTxDialog = ref(false)
const showExportDialog = ref(false)
const newAccountName = ref('')
const newAccountBalance = ref(0)
const editingTxId = ref<number | null>(null)
const menu = ref()
const selectedAccountId = ref<number | null>(null)

const menuItems = ref([
    {
        label: 'حساب‌ها',
        icon: 'pi pi-wallet',
        command: () => { showAccountDrawer.value = true }
    },
    {
        label: 'تاریخچه کلی',
        icon: 'pi pi-history',
        command: () => { router.push('/global-history') }
    },
    {
        label: 'خروجی',
        icon: 'pi pi-print',
        command: () => { showExportDialog.value = true }
    },
    {
        label: 'خروج',
        icon: 'pi pi-sign-out',
        command: () => { auth.logout() }
    }
])

const txForm = ref<{
    account_id: number
    amount: number
    type: 'INCOME' | 'EXPENSE'
    description: string
    date: number
}>({
    account_id: 0,
    amount: 0,
    type: 'EXPENSE',
    description: '',
    date: Date.now()
})

const exportOptions = ref({
    limit: 10,
    type: 'last' // 'last' or 'range'
})

const transactionTypes = ['EXPENSE', 'INCOME']

const filteredTransactions = computed(() => {
    if (selectedAccountId.value === null) {
        return store.transactions
    }
    return store.transactions.filter(t => t.account_id === selectedAccountId.value)
})

// Totals Computed
const totalIncome = computed(() => filteredTransactions.value.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0))
const totalExpense = computed(() => filteredTransactions.value.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value)

const sortedTransactions = computed(() => {
    const sorted = [...filteredTransactions.value].sort((a, b) => {
        if (b.date !== a.date) {
            return b.date - a.date
        }
        return (b.created_at || 0) - (a.created_at || 0)
    })

    let currentBalance = netBalance.value

    return sorted.map(tx => {
        const balanceAfterDoc = currentBalance
        if (tx.type === 'INCOME') {
            currentBalance -= tx.amount
        } else {
            currentBalance += tx.amount
        }
        
        return {
            ...tx,
            running_balance: balanceAfterDoc
        }
    })
})


onMounted(() => {
    store.sync()
})

const createAccount = async () => {
    await store.createAccount(newAccountName.value, newAccountBalance.value)
    showAccountDialog.value = false
    newAccountName.value = ''
    newAccountBalance.value = 0
}

const saveTx = async () => {
    if (!txForm.value.account_id && selectedAccountId.value) {
        txForm.value.account_id = selectedAccountId.value
    }
    
    if (editingTxId.value) {
        await store.updateTransaction(editingTxId.value, txForm.value)
    } else {
        await store.createTransaction(txForm.value)
    }
    showTxDialog.value = false
    editingTxId.value = null
}

const openTxDialog = () => {
    editingTxId.value = null
    txForm.value = {
        account_id: selectedAccountId.value || (store.accounts.length > 0 ? store.accounts[0].id : 0),
        amount: 0,
        type: 'EXPENSE',
        description: '',
        date: Date.now()
    }
    showTxDialog.value = true
}

const editTx = (tx: any) => {
    editingTxId.value = tx.id
    txForm.value = {
        account_id: tx.account_id,
        amount: tx.amount,
        type: tx.type,
        description: tx.description || '',
        date: tx.date
    }
    showTxDialog.value = true
}

const deleteTx = async (id: number) => {
    if(confirm('Delete transaction?')) {
        await store.deleteTransaction(id)
    }
}

const exportData = async () => {
    const limit = exportOptions.value.limit
    
    const query: any = { limit: limit.toString() }
    if (selectedAccountId.value) {
        query.accountId = selectedAccountId.value.toString()
    }

    const url = router.resolve({ name: 'export', query: query }).href
    window.open(url, '_blank')
    showExportDialog.value = false
}

const toggleMenu = (event: any) => {
    menu.value.toggle(event)
}

const selectAccount = (id: number | null) => {
    selectedAccountId.value = id
    showAccountDrawer.value = false
}

const currentAccountName = computed(() => {
    if (!selectedAccountId.value) return 'همه حساب‌ها'
    const acc = store.accounts.find(a => a.id === selectedAccountId.value)
    return acc ? acc.name : 'Unknown Account'
})

</script>

<template>
    <div class="p-4 max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <Toolbar class="rounded-xl shadow-sm border-none bg-surface-0 dark:bg-white">
            <template #start>
                <div class="flex flex-col">
                    <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                        Monfred Budget
                    </h1>
                    <span class="text-sm text-surface-500" v-if="selectedAccountId">حساب: <span class="font-bold text-black">{{ currentAccountName }}</span></span>
                    <span class="text-sm text-surface-500" v-else>خوش آمدید، {{ auth.user?.username }}</span>
                </div>
            </template>
            <template #end>
                <div class="flex gap-2">
                    <!-- Desktop Buttons -->
                    <div class="hidden md:flex gap-2">
                        <Button label="حساب‌ها" icon="pi pi-wallet" severity="info" text @click="showAccountDrawer = true" />
                        <Button label="تاریخچه کلی" icon="pi pi-history" severity="secondary" text @click="router.push('/global-history')" />
                        <Button label="خروجی" icon="pi pi-print" severity="help" text @click="showExportDialog = true" />
                        <Button label="خروج" icon="pi pi-sign-out" severity="secondary" text @click="auth.logout" />
                    </div>
                    <!-- Mobile Menu Button -->
                    <div class="md:hidden">
                        <Button icon="pi pi-bars" @click="toggleMenu" text severity="secondary" />
                        <Menu ref="menu" :model="menuItems" :popup="true" />
                    </div>
                </div>
            </template>
        </Toolbar>

        <!-- Account Drawer -->
        <Drawer v-model:visible="showAccountDrawer" header="لیست حساب‌ها" position="right" class="!w-full md:!w-80">
            <div class="flex flex-col gap-4">
                <Button label="همه حساب‌ها" icon="pi pi-list" :outlined="selectedAccountId !== null" :severity="selectedAccountId === null ? 'primary' : 'secondary'" class="w-full" @click="selectAccount(null)" />
                
                <div class="space-y-3">
                    <Card v-for="acc in store.accounts" :key="acc.id" 
                        class="shadow-sm border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 cursor-pointer hover:shadow-md transition-shadow"
                        :class="{'!border-primary-500 !bg-blue-50': selectedAccountId === acc.id}"
                        @click="selectAccount(acc.id)">
                        <template #title>
                            <div class="flex justify-between items-center text-base">
                                <span>{{ acc.name }}</span>
                                <i class="pi pi-wallet" :class="selectedAccountId === acc.id ? 'text-primary-600' : 'text-surface-400'"></i>
                            </div>
                        </template>
                        <template #content>
                            <div class="text-xl font-bold text-surface-900 dark:text-surface-0">
                                {{ formatCurrency(acc.balance) }}
                            </div>
                        </template>
                    </Card>
                </div>
                
                <Button label="افزودن حساب جدید" icon="pi pi-plus" outlined class="w-full mt-4" @click="showAccountDialog = true" />
            </div>
        </Drawer>

        <!-- Totals Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card class="bg-green-50 border-s-4 border-green-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">مجموع درآمد ({{ currentAccountName }})</span>
                        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalIncome) }}</div>
                    </div>
                </template>
            </Card>
            <Card class="bg-red-50 border-s-4 border-red-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">مجموع هزینه ({{ currentAccountName }})</span>
                        <div class="text-2xl font-bold text-red-600">{{ formatCurrency(totalExpense) }}</div>
                    </div>
                </template>
            </Card>
            <Card class="bg-blue-50 border-s-4 border-blue-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">تراز ({{ currentAccountName }})</span>
                        <div class="text-2xl font-bold" :class="netBalance >= 0 ? 'text-blue-600' : 'text-red-600'">
                            {{ formatCurrency(netBalance) }}
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Transactions Table -->
        <Card class="shadow-lg bg-white dark:bg-white text-surface-900 dark:text-black">
            <template #title>
                <div class="flex justify-between items-center text-surface-900 dark:text-black">
                    <div class="flex items-center gap-2">
                        <span>تراکنش‌های اخیر</span>
                        <Tag v-if="selectedAccountId" severity="info" :value="currentAccountName" />
                    </div>
                    <Button label="تراکنش جدید" icon="pi pi-plus" @click="openTxDialog" />
                </div>
            </template>
            <template #content>
                <DataTable :value="sortedTransactions" paginator :rows="10" tableStyle="min-width: 50rem">
                    <Column field="date" header="تاریخ" class="text-right">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.date) }}
                        </template>
                    </Column>
                    <Column field="description" header="توضیحات" class="text-right"></Column>
                    <Column field="running_balance" header="مانده" class="text-right">
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.running_balance) }}
                        </template>
                    </Column>
                    <Column field="amount" header="مبلغ" class="text-right">
                        <template #body="slotProps">
                            <span :class="slotProps.data.type === 'INCOME' ? 'text-green-600' : 'text-red-600'" class="font-bold">
                                {{ slotProps.data.type === 'INCOME' ? '+' : '-' }}{{ formatCurrency(slotProps.data.amount) }}
                            </span>
                        </template>
                    </Column>
                    <Column field="type" header="نوع" class="text-right">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.type === 'INCOME' ? 'درآمد' : 'هزینه'" :severity="slotProps.data.type === 'INCOME' ? 'success' : 'danger'" />
                        </template>
                    </Column>
                    <Column header="عملیات" class="text-right">
                        <template #body="slotProps">
                            <div class="flex gap-2">
                                <Button icon="pi pi-pencil" text rounded severity="warn" @click="editTx(slotProps.data)" v-tooltip="'Edit'" />
                                <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteTx(slotProps.data.id)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>

        <!-- Dialogs -->
        <Dialog v-model:visible="showAccountDialog" modal header="افزودن حساب" :style="{ width: '25rem' }">
            <div class="flex flex-col gap-4 mb-4">
                <div class="flex flex-col gap-2">
                    <label for="accName">نام حساب</label>
                    <InputText id="accName" v-model="newAccountName" class="text-right" dir="rtl" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="accBal">موجودی اولیه</label>

                    <InputGroup>
                        <InputNumber id="accBal" v-model="newAccountBalance" :maxFractionDigits="0" />
                        <InputGroupAddon>ریال</InputGroupAddon>
                    </InputGroup>
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button type="button" label="انصراف" severity="secondary" @click="showAccountDialog = false"></Button>
                <Button type="button" label="ثبت" @click="createAccount"></Button>
            </div>
        </Dialog>

        <Dialog v-model:visible="showTxDialog" modal :header="editingTxId ? 'ویرایش تراکنش' : 'تراکنش جدید'" :style="{ width: '30rem' }">
            <div class="flex flex-col gap-4 mb-4">
                <div class="flex flex-col gap-2">
                    <label>حساب</label>
                    <Dropdown v-model="txForm.account_id" :options="store.accounts" optionLabel="name" optionValue="id" class="text-right" overlayClass="text-right" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>نوع</label>
                    <Dropdown v-model="txForm.type" :options="transactionTypes" class="text-right">
                        <template #option="slotProps">
                            {{ slotProps.option === 'INCOME' ? 'درآمد' : 'هزینه' }}
                        </template>
                        <template #value="slotProps">
                             {{ slotProps.value === 'INCOME' ? 'درآمد' : (slotProps.value === 'EXPENSE' ? 'هزینه' : slotProps.value) }}
                        </template>
                    </Dropdown>
                </div>
                <div class="grid grid-cols-1 gap-4">
                     <div class="flex flex-col gap-2">
                        <label>مبلغ</label>
                        <InputGroup>
                            <InputNumber v-model="txForm.amount" :maxFractionDigits="0" />
                            <InputGroupAddon>ریال</InputGroupAddon>
                        </InputGroup>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label>تاریخ</label>
                        <PersianDatePicker v-model="txForm.date" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label>توضیحات</label>
                    <InputText v-model="txForm.description" class="text-right" dir="rtl" />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button type="button" label="انصراف" severity="secondary" @click="showTxDialog = false"></Button>
                <Button type="button" label="ثبت" @click="saveTx"></Button>
            </div>
        </Dialog>

        <!-- Export Dialog -->
        <Dialog v-model:visible="showExportDialog" modal header="خروجی گرفتن" :style="{ width: '25rem' }">
             <div class="flex flex-col gap-4 mb-4">
                <div class="flex flex-col gap-2">
                    <label>تعداد آیتم‌ها</label>
                    <Dropdown v-model="exportOptions.limit" :options="[10, 20, 50, 100, 1000]" class="text-right" />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                 <Button type="button" label="انصراف" severity="secondary" @click="showExportDialog = false"></Button>
                <Button type="button" label="مشاهده فایل چاپی" icon="pi pi-print" @click="exportData"></Button>
            </div>
        </Dialog>
    </div>
</template>
