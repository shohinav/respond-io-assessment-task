import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateTimeConnectorNode from '@/components/nodes/DateTimeConnectorNode.vue'

function mountConnector(overrides = {}) {
    return mount(DateTimeConnectorNode, {
        props: {
            data: {
                connectorType: 'success',
                name: 'Success',
                raw: { id: 's1' },
                isLeaf: true,
                ...overrides,
            },
        },
        global: { stubs: { Handle: true } },
    })
}

describe('DateTimeConnectorNode', () => {
    it('shows an add-step button under an empty branch', () => {
        const wrapper = mountConnector()
        expect(wrapper.find('button[aria-label="Add a step after Success"]').exists()).toBe(true)
    })
})
