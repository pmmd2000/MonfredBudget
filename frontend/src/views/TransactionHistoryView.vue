<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { formatCurrency, formatDateTime } from '../utils'
import Timeline from 'primevue/timeline'
import Card from 'primevue/card'
import Button from 'primevue/button'

const route = useRoute()
const router = useRouter()
const store = useDataStore()
const id = Number(route.params.id)

onMounted(() => {
    store.fetchHistory(id)
})

const revert = async (historyId: number) => {
    if(confirm('آیا از بازگردانی به این نسخه اطمینان دارید؟')) {
        await store.revertTransaction(id, historyId)
        alert('بازگردانی با موفقیت انجام شد')
    }
}
</script>

<template>
    <div class="p-4 max-w-4xl mx-auto">
        <Button label="بازگشت" icon="pi pi-arrow-right" text @click="router.back()" class="mb-4" />
        
        <Card class="bg-white dark:bg-white text-surface-900 dark:text-black shadow-xl">
            <template #title>تاریخچه تراکنش (ماشین زمان)</template>
            <template #subtitle>یک نقطه زمانی را برای بازگردانی انتخاب کنید.</template>
            <template #content>
                <Timeline :value="store.history" align="alternate" class="customized-timeline">
                    <template #marker="slotProps">
                        <span class="flex w-8 h-8 items-center justify-center text-white rounded-full shadow-sm" 
                            :class="{
                                'bg-green-500': slotProps.item.change_type === 'CREATE',
                                'bg-blue-500': slotProps.item.change_type === 'UPDATE',
                                'bg-red-500': slotProps.item.change_type === 'DELETE',
                                'bg-purple-500': slotProps.item.change_type === 'RESTORE'
                            }">
                            <i :class="{
                                'pi pi-plus': slotProps.item.change_type === 'CREATE',
                                'pi pi-pencil': slotProps.item.change_type === 'UPDATE',
                                'pi pi-trash': slotProps.item.change_type === 'DELETE',
                                'pi pi-refresh': slotProps.item.change_type === 'RESTORE'
                            }"></i>
                        </span>
                    </template>
                    <template #content="slotProps">
                        <Card class="mt-4 mb-8 border border-surface-200 dark:border-surface-200 bg-surface-50 dark:bg-gray-50 text-surface-900 dark:text-black">
                            <template #title>
                                {{ slotProps.item.change_type === 'CREATE' ? 'ایجاد' : (slotProps.item.change_type === 'UPDATE' ? 'ویرایش' : slotProps.item.change_type) }}
                            </template>
                            <template #subtitle>
                                {{ formatDateTime(slotProps.item.changed_at) }}
                            </template>
                            <template #content>
                                <div class="space-y-2 text-sm">
                                    <div v-if="slotProps.item.is_deleted" class="text-red-500 font-bold">حذف شده</div>
                                    <div v-else>
                                        <p><strong>مبلغ:</strong> {{ formatCurrency(slotProps.item.amount) }} ریال</p>
                                        <p><strong>توضیحات:</strong> {{ slotProps.item.description || '-' }}</p>
                                    </div>
                                    <Button label="بازگردانی به اینجا" size="small" severity="help" class="mt-2" 
                                        @click="revert(slotProps.item.history_id)" />
                                </div>
                            </template>
                        </Card>
                    </template>
                </Timeline>
            </template>
        </Card>
    </div>
</template>
