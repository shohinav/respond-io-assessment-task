import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { toFlowGraph, toPayloadType } from '@/api/flowApi'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MAX_HISTORY = 50

function nextId(existingIds) {
    let id
    do {
        id = Math.random().toString(16).slice(2, 8)
    } while (existingIds.includes(id))
    return id
}

const clone = (value) => JSON.parse(JSON.stringify(value))

/** Canonical payload, computed graph, and capped snapshot history. */
export const useFlowStore = defineStore('flow', () => {
    const payload = ref([])
    const savedSnapshot = ref('[]')
    const history = ref([])
    const historyIndex = ref(-1)

    const graph = computed(() => toFlowGraph(payload.value))
    const nodes = computed(() => graph.value.nodes)
    const edges = computed(() => graph.value.edges)

    const canUndo = computed(() => historyIndex.value > 0)
    const canRedo = computed(() => historyIndex.value < history.value.length - 1)

    function snapshotJson() {
        return JSON.stringify(payload.value)
    }

    const isDirty = computed(() => snapshotJson() !== savedSnapshot.value)

    function saveHistory() {
        const snapshot = snapshotJson()
        if (history.value[historyIndex.value] === snapshot) return

        history.value = history.value.slice(0, historyIndex.value + 1)
        history.value.push(snapshot)
        if (history.value.length > MAX_HISTORY) history.value.shift()
        historyIndex.value = history.value.length - 1
    }

    function applySnapshot(json) {
        payload.value = JSON.parse(json)
    }

    function undo() {
        if (!canUndo.value) return
        historyIndex.value -= 1
        applySnapshot(history.value[historyIndex.value])
    }

    function redo() {
        if (!canRedo.value) return
        historyIndex.value += 1
        applySnapshot(history.value[historyIndex.value])
    }

    /** Replace the payload and reset history during hydration. */
    function setPayload(next) {
        payload.value = clone(next ?? [])
        savedSnapshot.value = snapshotJson()
        history.value = [savedSnapshot.value]
        historyIndex.value = 0
    }

    function markSaved() {
        savedSnapshot.value = snapshotJson()
    }

    function discardChanges() {
        applySnapshot(savedSnapshot.value)
        history.value = [savedSnapshot.value]
        historyIndex.value = 0
    }

    function updateNode(nodeId, updates = {}) {
        let found = false

        payload.value = payload.value.map((node) => {
            if (String(node.id) !== String(nodeId)) return node
            found = true

            const next = { ...node }
            if (updates.name !== undefined) next.name = updates.name
            if (updates.data !== undefined) next.data = { ...node.data, ...updates.data }
            if (updates.position !== undefined) next.position = updates.position
            return next
        })

        if (found) saveHistory()
        return found
    }

    function updateNodePositions(positionsByNodeId) {
        let changed = false

        payload.value = payload.value.map((node) => {
            const position = positionsByNodeId[String(node.id)]
            if (!position) return node
            changed = true
            return { ...node, position: { x: position.x, y: position.y } }
        })

        if (changed) saveHistory()
    }

    function addNode({ type, name, description, parentId = null, childId = null }) {
        const id = nextId(payload.value.map((n) => String(n.id)))
        const data = {}
        if (description) data.description = description

        if (type === 'sendMessage') {
            data.payload = [{ type: 'text', text: '' }]
        } else if (type === 'addComment') {
            data.comment = ''
        } else if (type === 'businessHours') {
            data.times = DAYS.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
            data.timezone = 'Asia/Kuala_Lumpur'
        }

        const child =
            childId != null ? payload.value.find((n) => String(n.id) === String(childId)) : null
        const insertable =
            child &&
            String(child.parentId) === String(parentId) &&
            child.type !== 'dateTimeConnector'

        const node = { id, parentId, type: toPayloadType(type), name, data }

        if (insertable) {
            const graph = toFlowGraph(payload.value)
            const parentFlow = graph.nodes.find((n) => n.id === String(parentId))
            const childFlow = graph.nodes.find((n) => n.id === String(childId))
            if (parentFlow && childFlow) {
                node.position = {
                    x: parentFlow.position.x,
                    y: Math.round((parentFlow.position.y + childFlow.position.y) / 2),
                }
            }
        }

        const appended = [...payload.value, node]

        if (type === 'businessHours') {
            const usedIds = appended.map((n) => String(n.id))
            const successId = nextId(usedIds)
            const failureId = nextId([...usedIds, successId])
            data.connectors = [successId, failureId]
            appended.push(
                {
                    id: successId,
                    parentId: id,
                    type: 'dateTimeConnector',
                    name: 'Success',
                    data: { connectorType: 'success' },
                },
                {
                    id: failureId,
                    parentId: id,
                    type: 'dateTimeConnector',
                    name: 'Failure',
                    data: { connectorType: 'failure' },
                },
            )
        }

        payload.value = appended

        if (insertable) {
            payload.value = payload.value.map((n) =>
                String(n.id) === String(childId) ? { ...n, parentId: id } : n,
            )
        }

        saveHistory()
        return id
    }

    /** Re-parent a node while rejecting self-connections and cycles. */
    function connectNodes(targetId, sourceId) {
        if (String(targetId) === String(sourceId)) return 'self'

        let cursor = payload.value.find((n) => String(n.id) === String(sourceId))
        while (cursor && cursor.parentId != null && cursor.parentId !== -1) {
            if (String(cursor.parentId) === String(targetId)) return 'cycle'
            cursor = payload.value.find((n) => String(n.id) === String(cursor.parentId))
        }

        payload.value = payload.value.map((node) =>
            String(node.id) === String(targetId) ? { ...node, parentId: sourceId } : node,
        )
        saveHistory()
        return true
    }

    /** Remove a step, its branch connectors, and re-home their children. */
    function deleteNode(nodeId) {
        const target = payload.value.find((n) => String(n.id) === String(nodeId))
        if (!target) return

        const doomed = new Set(
            payload.value
                .filter(
                    (n) => n.type === 'dateTimeConnector' && String(n.parentId) === String(nodeId),
                )
                .map((n) => String(n.id)),
        )
        doomed.add(String(nodeId))

        payload.value = payload.value
            .filter((n) => !doomed.has(String(n.id)))
            .map((n) => (doomed.has(String(n.parentId)) ? { ...n, parentId: target.parentId } : n))

        saveHistory()
    }

    return {
        payload,
        nodes,
        edges,
        isDirty,
        canUndo,
        canRedo,
        setPayload,
        markSaved,
        discardChanges,
        updateNode,
        updateNodePositions,
        addNode,
        connectNodes,
        deleteNode,
        undo,
        redo,
    }
})
