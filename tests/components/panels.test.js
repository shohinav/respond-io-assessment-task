import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SendMessagePanel from '@/components/drawers/SendMessagePanel.vue'
import BusinessHoursPanel from '@/components/drawers/BusinessHoursPanel.vue'

const node = (data) => ({ id: 'n1', type: 'sendMessage', name: 'N', data })

describe('node detail panels', () => {
    it('updates message text while preserving attachments', async () => {
        const attachment = { type: 'attachment', attachment: 'data:img', name: 'a.png' }
        const wrapper = mount(SendMessagePanel, {
            props: { node: node({ payload: [attachment] }) },
        })

        await wrapper.find('#message-text').setValue('Hello')
        expect(wrapper.emitted('update').at(-1)[0].payload).toEqual([
            { type: 'text', text: 'Hello' },
            attachment,
        ])
    })

    it('rejects an attachment larger than 1 MB', async () => {
        const wrapper = mount(SendMessagePanel, { props: { node: node({ payload: [] }) } })
        const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [big] })
        await input.trigger('change')

        expect(wrapper.emitted('update')).toBeUndefined()
        expect(wrapper.emitted('attachment-error').at(-1)[0]).toContain('big.png')
    })

    it('toggles a business-hours day with canonical defaults', async () => {
        const wrapper = mount(BusinessHoursPanel, {
            props: { node: node({ times: [], timezone: 'UTC' }) },
            global: { stubs: { VueDatePicker: true } },
        })

        await wrapper.find('[role="switch"]').trigger('click')
        expect(wrapper.emitted('update').at(-1)[0].times).toEqual([
            { day: 'mon', startTime: '09:00', endTime: '17:00' },
        ])
    })
})
