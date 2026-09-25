import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '@/stores/flow'
import { toFlowGraph, computeLayout } from '@/api/flowApi'

const SAMPLE = [
    { id: 1, parentId: -1, type: 'trigger', name: 'Trigger', data: {}, position: { x: 250, y: 0 } },
    {
        name: 'Away Message',
        id: 'b6a0c1',
        type: 'sendMessage',
        data: { payload: [{ type: 'text', text: 'Away' }] },
        parentId: '28c4b9',
        position: { x: 468, y: 540 },
    },
    {
        name: 'Business Hours',
        id: 'd09c08',
        type: 'dateTime',
        data: {
            times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }],
            connectors: ['161f52', '28c4b9'],
            timezone: 'UTC',
        },
        parentId: 1,
        position: { x: 235, y: 180 },
    },
    {
        name: 'Success',
        id: '161f52',
        type: 'dateTimeConnector',
        data: { connectorType: 'success' },
        parentId: 'd09c08',
        position: { x: 90, y: 360 },
    },
    {
        name: 'Failure',
        id: '28c4b9',
        type: 'dateTimeConnector',
        data: { connectorType: 'failure' },
        parentId: 'd09c08',
        position: { x: 560, y: 360 },
    },
]

function storeWithSample() {
    const store = useFlowStore()
    store.setPayload(SAMPLE)
    return store
}

describe('flow store', () => {
    beforeEach(() => setActivePinia(createPinia()))

    it('creates the supported node types and business-hour branches', () => {
        const store = storeWithSample()
        expect(store.isDirty).toBe(false)
        expect(store.canUndo).toBe(false)
        store.addNode({ type: 'sendMessage', name: 'Message', description: '' })
        store.addNode({ type: 'addComment', name: 'Comment', description: '' })
        store.addNode({ type: 'businessHours', name: 'Hours', description: '' })

        const hours = store.payload.find((n) => n.name === 'Hours')
        expect(store.payload.filter((n) => n.type === 'sendMessage')).toHaveLength(2)
        expect(hours.type).toBe('dateTime')
        expect(store.payload.filter((n) => n.parentId === hours.id)).toHaveLength(2)
    })

    it('updates nodes and places new children near dragged parents', () => {
        const store = storeWithSample()
        store.updateNode('b6a0c1', { name: 'Renamed', data: { description: 'note' } })
        store.updateNodePositions({ b6a0c1: { x: 100, y: 200 } })
        const childId = store.addNode({
            type: 'sendMessage',
            name: 'Child',
            description: '',
            parentId: 'b6a0c1',
        })

        const child = toFlowGraph(store.payload).nodes.find((n) => n.id === childId)
        expect(store.payload.find((n) => n.id === 'b6a0c1')).toMatchObject({
            name: 'Renamed',
            data: { description: 'note' },
        })
        expect(child.position.y).toBe(420)
    })

    it('deletes a branch, its connectors, and re-homes children', () => {
        const store = storeWithSample()
        store.deleteNode('d09c08')

        expect(store.payload.some((n) => n.id === 'd09c08')).toBe(false)
        expect(store.payload.some((n) => n.id === '161f52')).toBe(false)
        expect(store.payload.find((n) => n.id === 'b6a0c1').parentId).toBe(1)

        store.undo()
        expect(store.payload).toHaveLength(5)
    })

    it('handles connections and insertion without stealing branch connectors', () => {
        const store = storeWithSample()
        expect(store.connectNodes('b6a0c1', 'b6a0c1')).toBe('self')
        expect(store.connectNodes(1, 'b6a0c1')).toBe('cycle')
        expect(store.connectNodes('b6a0c1', 'd09c08')).toBe(true)

        store.setPayload(SAMPLE)
        const id = store.addNode({
            type: 'sendMessage',
            name: 'Inserted',
            description: '',
            parentId: '28c4b9',
            childId: 'b6a0c1',
        })
        expect(store.payload.find((n) => n.id === 'b6a0c1').parentId).toBe(id)

        store.addNode({
            type: 'sendMessage',
            name: 'Sibling',
            description: '',
            parentId: 'd09c08',
            childId: '161f52',
        })
        expect(store.payload.find((n) => n.id === '161f52').parentId).toBe('d09c08')
    })

    it('tracks dirty state, discard, undo, and redo', () => {
        const store = storeWithSample()
        store.updateNode('b6a0c1', { name: 'Edited' })
        expect(store.isDirty).toBe(true)

        store.discardChanges()
        expect(store.isDirty).toBe(false)
        expect(store.payload.find((n) => n.id === 'b6a0c1').name).toBe('Away Message')

        store.updateNode('b6a0c1', { name: 'First' })
        store.undo()
        store.redo()
        expect(store.payload.find((n) => n.id === 'b6a0c1').name).toBe('First')

        store.addNode({ type: 'sendMessage', name: 'Saved', description: '' })
        store.markSaved()
        expect(store.isDirty).toBe(false)
    })

    it('uses stored positions and a layout fallback', () => {
        const layout = computeLayout(SAMPLE)
        expect(layout.get('161f52')).toBeDefined()
        const graph = toFlowGraph([
            ...SAMPLE,
            { id: 'new', parentId: 'b6a0c1', type: 'addComment', data: {} },
        ])
        expect(graph.nodes.find((n) => n.id === 'new').position.y).toBe(760)
    })
})
