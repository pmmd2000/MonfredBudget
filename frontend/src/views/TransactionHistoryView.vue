<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
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
    if(confirm('Revert to this version?')) {
        await store.revertTransaction(id, historyId)
        alert('Reverted successfully')
    }
}
</script>

<template>
    <div class="p-4 max-w-4xl mx-auto">
        <Button label="Back" icon="pi pi-arrow-left" text @click="router.back()" class="mb-4" />
        
        <Card class="bg-surface-0 dark:bg-surface-800 shadow-xl">
            <template #title>Transaction History (Time Travel)</template>
            <template #subtitle>Select a point in time to revert this transaction to.</template>
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
                        <Card class="mt-4 mb-8 border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
                            <template #title>
                                {{ slotProps.item.change_type }}
                            </template>
                            <template #subtitle>
                                {{ new Date(slotProps.item.changed_at).toLocaleString() }}
                            </template>
                            <template #content>
                                <div class="space-y-2 text-sm">
                                    <div v-if="slotProps.item.is_deleted" class="text-red-500 font-bold">DELETED</div>
                                    <div v-else>
                                        <p><strong>Amount:</strong> ${{ slotProps.item.amount }}</p>
                                        <p><strong>Desc:</strong> {{ slotProps.item.description || 'N/A' }}</p>
                                    </div>
                                    <Button label="Revert here" size="small" severity="help" class="mt-2" 
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
