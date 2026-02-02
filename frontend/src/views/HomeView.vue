<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

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
const newAccountName = ref('')
const newAccountBalance = ref(0)

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

const transactionTypes = ['EXPENSE', 'INCOME']

onMounted(() => {
    store.sync()
})

const createAccount = async () => {
    await store.createAccount(newAccountName.value, newAccountBalance.value)
    showAccountDialog.value = false
    newAccountName.value = ''
    newAccountBalance.value = 0
}

const createTx = async () => {
    await store.createTransaction(txForm.value)
    showTxDialog.value = false
}

const openTxDialog = () => {
    if(store.accounts.length > 0 && store.accounts[0]) txForm.value.account_id = store.accounts[0].id
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
</script>

<template>
    <div class="p-4 max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <Toolbar class="rounded-xl shadow-sm border-none bg-surface-0 dark:bg-surface-800">
            <template #start>
                <div class="flex flex-col">
                    <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                        Persian Tracker
                    </h1>
                    <span class="text-sm text-surface-500">Welcome, {{ auth.user?.username }}</span>
                </div>
            </template>
            <template #end>
                <Button label="Logout" icon="pi pi-sign-out" severity="secondary" text @click="auth.logout" />
            </template>
        </Toolbar>

        <!-- Accounts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card v-for="acc in store.accounts" :key="acc.id" class="shadow-md hover:shadow-lg transition-shadow dark:bg-surface-800">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>{{ acc.name }}</span>
                        <i class="pi pi-wallet text-primary-500"></i>
                    </div>
                </template>
                <template #content>
                    <div class="text-3xl font-bold text-surface-900 dark:text-surface-0">
                        ${{ acc.balance.toLocaleString() }}
                    </div>
                </template>
            </Card>
            
            <!-- Add Account Button Card -->
            <button @click="showAccountDialog = true" class="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-surface-300 hover:border-primary-500 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors h-full min-h-[140px]">
                <i class="pi pi-plus text-2xl mb-2 text-surface-400"></i>
                <span class="font-semibold text-surface-500">Add Account</span>
            </button>
        </div>

        <!-- Transactions Table -->
        <Card class="shadow-lg dark:bg-surface-800">
            <template #title>
                <div class="flex justify-between items-center">
                    <span>Recent Transactions</span>
                    <Button label="New Transaction" icon="pi pi-plus" @click="openTxDialog" />
                </div>
            </template>
            <template #content>
                <DataTable :value="store.transactions" paginator :rows="10" tableStyle="min-width: 50rem">
                    <Column field="date" header="Date">
                        <template #body="slotProps">
                            {{ new Date(slotProps.data.date).toLocaleDateString() }}
                        </template>
                    </Column>
                    <Column field="description" header="Description"></Column>
                    <Column field="amount" header="Amount">
                        <template #body="slotProps">
                            <span :class="slotProps.data.type === 'INCOME' ? 'text-green-500' : 'text-red-500'">
                                {{ slotProps.data.type === 'INCOME' ? '+' : '-' }}${{ slotProps.data.amount }}
                            </span>
                        </template>
                    </Column>
                    <Column field="type" header="Type">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.type" :severity="slotProps.data.type === 'INCOME' ? 'success' : 'danger'" />
                        </template>
                    </Column>
                    <Column header="Actions">
                        <template #body="slotProps">
                            <div class="flex gap-2">
                                <Button icon="pi pi-history" text rounded severity="info" @click="viewHistory(slotProps.data.id)" v-tooltip="'History / Undo'" />
                                <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteTx(slotProps.data.id)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>

        <!-- Dialogs -->
        <Dialog v-model:visible="showAccountDialog" modal header="Add Account" :style="{ width: '25rem' }">
            <div class="flex flex-col gap-4 mb-4">
                <div class="flex flex-col gap-2">
                    <label for="accName">Name</label>
                    <InputText id="accName" v-model="newAccountName" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="accBal">Initial Balance</label>
                    <InputNumber id="accBal" v-model="newAccountBalance" mode="currency" currency="USD" />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button type="button" label="Cancel" severity="secondary" @click="showAccountDialog = false"></Button>
                <Button type="button" label="Save" @click="createAccount"></Button>
            </div>
        </Dialog>

        <Dialog v-model:visible="showTxDialog" modal header="New Transaction" :style="{ width: '30rem' }">
            <div class="flex flex-col gap-4 mb-4">
                <div class="flex flex-col gap-2">
                    <label>Account</label>
                    <Dropdown v-model="txForm.account_id" :options="store.accounts" optionLabel="name" optionValue="id" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>Type</label>
                    <Dropdown v-model="txForm.type" :options="transactionTypes" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                     <div class="flex flex-col gap-2">
                        <label>Amount</label>
                        <InputNumber v-model="txForm.amount" mode="currency" currency="USD" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label>Description</label>
                    <InputText v-model="txForm.description" />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button type="button" label="Cancel" severity="secondary" @click="showTxDialog = false"></Button>
                <Button type="button" label="Save" @click="createTx"></Button>
            </div>
        </Dialog>
    </div>
</template>
