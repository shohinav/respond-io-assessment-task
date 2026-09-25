import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CreateNodeDialog from '@/components/canvas/CreateNodeDialog.vue'
import { Select } from '@/components/ui/select'
import { useFlowStore } from '@/stores/flow'

async function settle(wrapper) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flushPromises()
    await wrapper.vm.$nextTick()
}

const dialogStubs = {
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' },
    DialogDescription: { template: '<div><slot /></div>' },
    DialogFooter: { template: '<div><slot /></div>' },
}

function mountDialog(open = true, props = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(CreateNodeDialog, {
        props: { open, ...props },
        global: { plugins: [pinia], stubs: dialogStubs },
    })
    return { wrapper }
}

async function chooseType(wrapper, type) {
    wrapper.findComponent(Select).vm.$emit('update:modelValue', type)
    await wrapper.vm.$nextTick()
}

describe('CreateNodeDialog', () => {
    it('blocks invalid submissions', async () => {
        const { wrapper } = mountDialog()
        const spy = vi.spyOn(useFlowStore(), 'addNode')

        await wrapper.find('form').trigger('submit')
        await settle(wrapper)

        expect(wrapper.text()).toContain('Title is required')
        expect(wrapper.text()).toContain('Please select a node type')
        expect(spy).not.toHaveBeenCalled()
    })

    it('adds a trimmed node with the supplied parent context', async () => {
        const { wrapper } = mountDialog(true, { parentId: 'p1', afterId: 'c1' })
        const store = useFlowStore()
        store.setPayload([
            { id: 'p1', parentId: -1, type: 'trigger', name: 'Trigger', data: {} },
            { id: 'c1', parentId: 'p1', type: 'sendMessage', name: 'Child', data: {} },
        ])
        const spy = vi.spyOn(store, 'addNode')

        await wrapper.find('#create-name').setValue('  Middle step  ')
        await chooseType(wrapper, 'addComment')
        await wrapper.find('form').trigger('submit')
        await settle(wrapper)

        expect(spy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'addComment',
                name: 'Middle step',
                parentId: 'p1',
                childId: 'c1',
            }),
        )
    })
})
