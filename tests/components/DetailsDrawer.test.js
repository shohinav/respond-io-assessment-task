import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import DetailsDrawer from '@/components/drawers/DetailsDrawer.vue'
import { useFlowStore } from '@/stores/flow'

const sheetStubs = {
    Sheet: { template: '<div><slot /></div>' },
    SheetContent: { template: '<div><slot /></div>' },
    SheetHeader: { template: '<div><slot /></div>' },
    SheetTitle: { template: '<div><slot /></div>' },
    SheetDescription: { template: '<div><slot /></div>' },
    Separator: true,
    Badge: { template: '<span><slot /></span>' },
    AlertDialog: { template: '<div><slot /></div>' },
    AlertDialogContent: { template: '<div><slot /></div>' },
    AlertDialogHeader: { template: '<div><slot /></div>' },
    AlertDialogTitle: { template: '<div><slot /></div>' },
    AlertDialogDescription: { template: '<div><slot /></div>' },
    AlertDialogFooter: { template: '<div><slot /></div>' },
    AlertDialogAction: { template: '<button><slot /></button>' },
    AlertDialogCancel: { template: '<button><slot /></button>' },
}

function mountDrawer(data = { payload: [{ type: 'text', text: 'Hello' }] }, extraNodes = []) {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useFlowStore()
    store.setPayload([
        { id: 'n1', parentId: -1, type: 'sendMessage', name: 'Welcome', data },
        ...extraNodes,
    ])
    const wrapper = mount(DetailsDrawer, {
        props: { nodeId: 'n1' },
        global: { plugins: [pinia, VueQueryPlugin], stubs: sheetStubs },
    })
    return { wrapper, store }
}

function buttonByText(wrapper, text) {
    const button = wrapper.findAll('button').find((b) => b.text().trim() === text)
    expect(button, `button "${text}" should render`).toBeTruthy()
    return button
}

async function clickSave(wrapper) {
    await buttonByText(wrapper, 'Save').trigger('click')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flushPromises()
}

describe('DetailsDrawer', () => {
    it('saves a draft and discards later draft edits', async () => {
        const { wrapper, store } = mountDrawer()
        await flushPromises()
        await wrapper.find('#node-name').setValue('Renamed')
        await clickSave(wrapper)
        expect(store.payload.find((n) => n.id === 'n1').name).toBe('Renamed')

        await wrapper.find('#node-name').setValue('Discard me')
        wrapper.vm.requestClose()
        await buttonByText(wrapper, 'Leave without saving').trigger('click')
        expect(store.payload.find((n) => n.id === 'n1').name).toBe('Renamed')
    })

    it('does not persist when another node is invalid', async () => {
        const { wrapper, store } = mountDrawer(undefined, [
            {
                id: 'n2',
                parentId: 'n1',
                type: 'addComment',
                name: 'Invalid comment',
                data: { comment: 'x'.repeat(501) },
            },
        ])
        await flushPromises()

        await wrapper.find('#node-name').setValue('Renamed')
        await clickSave(wrapper)

        expect(store.payload.find((item) => item.id === 'n1').name).toBe('Welcome')
        expect(localStorage.getItem('respond-flow-payload')).toBeNull()
    })

    it('removes only the confirmed duplicate attachment', async () => {
        const attachment = {
            type: 'attachment',
            attachment: 'data:image/png;base64,AAA',
            name: 'same.png',
        }
        const { wrapper, store } = mountDrawer({
            payload: [{ type: 'text', text: 'Hi' }, attachment, { ...attachment }],
        })
        await flushPromises()

        await wrapper.findAll('button[aria-label^="Remove attachment"]')[1].trigger('click')
        await buttonByText(wrapper, 'Remove').trigger('click')
        await clickSave(wrapper)

        const payload = store.payload.find((n) => n.id === 'n1').data.payload
        expect(payload.filter((item) => item.type === 'attachment')).toHaveLength(1)
    })
})
