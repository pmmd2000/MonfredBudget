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
import Tag from 'primevue/tag'

const store = useDataStore()
const auth = useAuthStore()
const router = useRouter()

const showAccountDialog = ref(false)
const showTxDialog = ref(false)
const showExportDialog = ref(false)
const newAccountName = ref('')
const newAccountBalance = ref(0)
const editingTxId = ref<number | null>(null)

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

// Totals Computed
const totalIncome = computed(() => store.transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0))
const totalExpense = computed(() => store.transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value)

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
        account_id: store.accounts.length > 0 ? store.accounts[0].id : 0,
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

const viewHistory = (id: number) => {
    router.push(`/history/${id}`)
}

const deleteTx = async (id: number) => {
    if(confirm('Delete transaction?')) {
        await store.deleteTransaction(id)
    }
}

const exportData = () => {
    const limit = exportOptions.value.limit
    // Simply print the current view or redirect to a print page?
    // User requested "Export Modal", "Printable HTML". 
    // Let's open a new window with the export view
    const url = router.resolve({ name: 'export', query: { limit: limit.toString() } }).href
    window.open(url, '_blank')
    showExportDialog.value = false
}
</script>

<template>
    <div class="p-4 max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <Toolbar class="rounded-xl shadow-sm border-none bg-surface-0 dark:bg-white">
            <template #start>
                <div class="flex flex-col">
                    <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                        مدیریت مالی شخصی
                    </h1>
                    <span class="text-sm text-surface-500">خوش آمدید، {{ auth.user?.username }}</span>
                </div>
            </template>
            <template #end>
                <div class="flex gap-2">
                    <Button label="تاریخچه کلی" icon="pi pi-history" severity="secondary" text @click="router.push('/global-history')" />
                    <Button label="خروجی" icon="pi pi-print" severity="help" text @click="showExportDialog = true" />
                    <Button label="خروج" icon="pi pi-sign-out" severity="secondary" text @click="auth.logout" />
                </div>
            </template>
        </Toolbar>

        <!-- Totals Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card class="bg-green-50 border-s-4 border-green-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">مجموع درآمد</span>
                        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalIncome) }} ریال</div>
                    </div>
                </template>
            </Card>
            <Card class="bg-red-50 border-s-4 border-red-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">مجموع هزینه</span>
                        <div class="text-2xl font-bold text-red-600">{{ formatCurrency(totalExpense) }} ریال</div>
                    </div>
                </template>
            </Card>
            <Card class="bg-blue-50 border-s-4 border-blue-500 shadow-sm">
                <template #content>
                    <div class="flex flex-col">
                        <span class="text-surface-600 mb-1">تراز کلی</span>
                        <div class="text-2xl font-bold" :class="netBalance >= 0 ? 'text-blue-600' : 'text-red-600'">
                            {{ formatCurrency(netBalance) }} ریال
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Accounts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card v-for="acc in store.accounts" :key="acc.id" class="shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-white">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>{{ acc.name }}</span>
                        <i class="pi pi-wallet text-primary-500"></i>
                    </div>
                </template>
                <template #content>
                    <div class="text-3xl font-bold text-surface-900 dark:text-black">
                        {{ formatCurrency(acc.balance) }} ریال
                    </div>
                </template>
            </Card>
            
            <!-- Add Account Button Card -->
            <button @click="showAccountDialog = true" class="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-surface-300 hover:border-primary-500 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors h-full min-h-[140px]">
                <i class="pi pi-plus text-2xl mb-2 text-surface-400"></i>
                <span class="font-semibold text-surface-500">افزودن حساب</span>
            </button>
        </div>

        <!-- Transactions Table -->
        <Card class="shadow-lg bg-white dark:bg-white text-surface-900 dark:text-black">
            <template #title>
                <div class="flex justify-between items-center text-surface-900 dark:text-black">
                    <span>تراکنش‌های اخیر</span>
                    <Button label="تراکنش جدید" icon="pi pi-plus" @click="openTxDialog" />
                </div>
            </template>
            <template #content>
                <DataTable :value="store.transactions" paginator :rows="10" tableStyle="min-width: 50rem">
                    <Column field="date" header="تاریخ" class="text-right">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.date) }}
                        </template>
                    </Column>
                    <Column field="description" header="توضیحات" class="text-right"></Column>
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
                                <Button icon="pi pi-history" text rounded severity="info" @click="viewHistory(slotProps.data.id)" v-tooltip="'History / Undo'" />
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
                    <InputNumber id="accBal" v-model="newAccountBalance" locale="fa-IR" :maxFractionDigits="0" suffix=" ریال" />
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
                        <InputNumber v-model="txForm.amount" locale="fa-IR" :maxFractionDigits="0" suffix=" ریال" />
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
