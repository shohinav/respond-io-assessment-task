import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { useUpdateFlowMutation, FLOW_QUERY_KEY } from '@/composables/useFlowQueries'
import { useFlowStore } from '@/stores/flow'

const Harness = defineComponent({
    setup() {
        return { mutateAsync: useUpdateFlowMutation().mutateAsync }
    },
    template: '<div />',
})

describe('useUpdateFlowMutation', () => {
    it('persists, updates the query cache, and marks the store saved', async () => {
        localStorage.clear()
        const pinia = createPinia()
        setActivePinia(pinia)
        const queryClient = new QueryClient()
        const wrapper = mount(Harness, {
            global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
        })
        const store = useFlowStore()
        store.setPayload([{ id: 1, parentId: -1, type: 'trigger', data: {} }])
        store.updateNode(1, { name: 'Trigger' })

        await wrapper.vm.mutateAsync(store.payload)
        await flushPromises()

        expect(store.isDirty).toBe(false)
        expect(queryClient.getQueryData(FLOW_QUERY_KEY)).toEqual(store.payload)
        expect(JSON.parse(localStorage.getItem('respond-flow-payload'))).toEqual(store.payload)
        vi.restoreAllMocks()
    })
})
