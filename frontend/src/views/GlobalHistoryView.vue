<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { formatCurrency, formatDateTime } from '../utils'
import Timeline from 'primevue/timeline'
import Card from 'primevue/card'
import Button from 'primevue/button'

const router = useRouter()
const store = useDataStore()

onMounted(() => {
    store.fetchGlobalHistory()
})



const rollback = async (historyId: number) => {
    if (confirm('هشدار: بازگشت به این زمان باعث حذف تمام تغییراتی می‌شود که بعد از این تاریخ انجام شده‌اند. آیا مطمئن هستید؟')) {
        await store.rollbackToHistory(historyId)
        alert('بازگشت به عقب با موفقیت انجام شد')
        router.push('/')
    }
}

const getIcon = (changeType: string) => {
    switch (changeType) {
        case 'CREATE': return 'pi pi-plus'
        case 'UPDATE': return 'pi pi-pencil'
        case 'DELETE': return 'pi pi-trash'
        case 'RESTORE': return 'pi pi-refresh'
        default: return 'pi pi-circle'
    }
}
</script>

<template>
    <div class="p-4 max-w-4xl mx-auto">
        <Button label="بازگشت" icon="pi pi-arrow-right" text @click="router.back()" class="mb-4" />
        
        <Card class="bg-white dark:bg-white text-surface-900 dark:text-black shadow-xl">
            <template #title>تاریخچه کلی عملیات</template>
            <template #subtitle>لیست تمام تغییرات انجام شده در سیستم</template>
            <template #content>
                <div v-if="!store.globalHistory.length" class="text-center p-4">
                    هنوز هیچ عملیاتی ثبت نشده است.
                </div>
                <Timeline :value="store.globalHistory" align="alternate" class="customized-timeline">
                     <template #marker="slotProps">
                        <span class="flex w-8 h-8 items-center justify-center text-white rounded-full shadow-sm" 
                            :class="{
                                'bg-green-500': slotProps.item.change_type === 'CREATE',
                                'bg-blue-500': slotProps.item.change_type === 'UPDATE',
                                'bg-red-500': slotProps.item.change_type === 'DELETE',
                                'bg-purple-500': slotProps.item.change_type === 'RESTORE'
                            }">
                            <i :class="getIcon(slotProps.item.change_type)"></i>
                        </span>
                    </template>
                    <template #content="slotProps">
                        <Card class="mt-4 mb-8 border border-surface-200 dark:border-surface-200 bg-surface-50 dark:bg-gray-50 text-surface-900 dark:text-black">
                             <template #title>
                                <div class="flex items-center gap-2">
                                    <span>{{ slotProps.item.change_type === 'CREATE' ? 'ایجاد' : (slotProps.item.change_type === 'UPDATE' ? 'ویرایش' : (slotProps.item.change_type === 'DELETE' ? 'حذف' : 'بازگردانی')) }}</span>
                                    <span v-if="slotProps.item.account_name" class="text-sm font-normal text-gray-500">({{ slotProps.item.account_name }})</span>
                                </div>
                            </template>
                            <template #subtitle>
                                {{ formatDateTime(slotProps.item.changed_at) }}
                            </template>
                            <template #content>
                                <div class="space-y-2 text-sm">
                                    <p><strong>مبلغ:</strong> {{ formatCurrency(slotProps.item.amount) }} ریال</p>
                                    <p v-if="slotProps.item.description"><strong>توضیحات:</strong> {{ slotProps.item.description }}</p>
                                    
                                    <div v-if="slotProps.item.is_deleted" class="text-red-500 font-bold mt-2">این آیتم حذف شده است</div>
                                    
                                    <Button label="بازگشت به این زمان" 
                                        icon="pi pi-undo" 
                                        size="small" 
                                        severity="danger" 
                                        outlined
                                        @click="rollback(slotProps.item.history_id)" 
                                        class="mt-4 w-full" 
                                        v-tooltip="'تمام تغییرات بعد از این زمان حذف خواهند شد'" />
                                </div>
                            </template>
                        </Card>
                    </template>
                </Timeline>
            </template>
        </Card>
    </div>
</template>
