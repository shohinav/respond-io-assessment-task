const STORAGE_KEY = 'respond-flow-payload'

const STEP_X = 320
const STEP_Y = 340

const CHILD_Y_GAP = 220

export const isConnector = (n) => n?.type === 'dateTimeConnector'

export const TYPE_LABELS = {
    trigger: 'Trigger',
    sendMessage: 'Send Message',
    addComment: 'Add Comment',
    dateTime: 'Business Hours',
    dateTimeConnector: 'Branch',
}

export function typeLabel(type) {
    return TYPE_LABELS[type] ?? type
}

export function toPayloadType(type) {
    return type === 'businessHours' ? 'dateTime' : type
}

function readStoredPayload() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : null
    } catch {
        return null
    }
}

function isQuotaError(error) {
    return (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    )
}

function savePayload(payload) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
        if (isQuotaError(error)) {
            throw new Error('Browser storage is full — remove some attachments and try again', {
                cause: error,
            })
        }
        throw error
    }
}

export function clearPayload() {
    localStorage.removeItem(STORAGE_KEY)
}

export function computeLayout(payload) {
    const childrenOf = new Map()
    for (const node of payload) {
        if (node.parentId === -1 || node.parentId == null) continue
        const key = String(node.parentId)
        const list = childrenOf.get(key) ?? []
        list.push(node)
        childrenOf.set(key, list)
    }

    const positions = new Map()
    let cursorX = 0

    function layoutSubtree(nodeId, depth) {
        if (positions.has(nodeId)) return positions.get(nodeId).x
        const children = childrenOf.get(String(nodeId)) ?? []
        let x
        if (children.length === 0) {
            x = cursorX
            cursorX += STEP_X
        } else {
            const childXs = children.map((child) => layoutSubtree(child.id, depth + 1))
            x = (childXs[0] + childXs[childXs.length - 1]) / 2
        }
        positions.set(nodeId, { x, y: depth * STEP_Y })
        return x
    }

    const roots = payload.filter((n) => n.parentId === -1)
    roots.forEach((root) => layoutSubtree(root.id, 0))

    const orphans = payload.filter((n) => n.parentId == null)
    if (orphans.length) {
        const laid = Array.from(positions.values())
        const maxX = laid.length ? Math.max(...laid.map((p) => p.x)) : 0
        orphans.forEach((node, i) => {
            if (!positions.has(node.id)) {
                positions.set(node.id, { x: maxX + STEP_X, y: i * STEP_Y })
            }
        })
    }

    return positions
}

export function toFlowGraph(payload) {
    const positions = computeLayout(payload)
    const byId = new Map(payload.map((n) => [String(n.id), n]))

    const childIds = new Set(
        payload
            .filter((n) => n.parentId !== -1 && n.parentId != null)
            .map((n) => String(n.parentId)),
    )

    const positionsByNode = new Map()
    const resolving = new Set()

    /** Keep nodes near their parent. */
    function resolvePosition(node) {
        const key = String(node.id)
        if (positionsByNode.has(key)) return positionsByNode.get(key)

        const fallback = positions.get(node.id) ?? { x: 0, y: 0 }
        if (resolving.has(key)) return fallback
        resolving.add(key)

        let position
        const parent = byId.get(String(node.parentId))
        if (node.position) {
            position = node.position
        } else if (parent) {
            const parentPosition = resolvePosition(parent)
            const parentFallback = positions.get(parent.id) ?? parentPosition
            position = {
                x: parentPosition.x + (fallback.x - parentFallback.x),
                y: parentPosition.y + CHILD_Y_GAP,
            }
        } else {
            position = fallback
        }

        resolving.delete(key)
        positionsByNode.set(key, position)
        return position
    }

    payload.forEach(resolvePosition)

    const nodes = payload.map((node) => ({
        id: String(node.id),
        type: node.type,
        position: resolvePosition(node),
        data: {
            ...node.data,
            name: node.name ?? '',
            raw: node,
            isLeaf: !childIds.has(String(node.id)),
        },
        selectable: !isConnector(node) && node.type !== 'trigger',
        draggable: true,
    }))

    const edges = []
    for (const node of payload) {
        if (node.parentId === -1 || node.parentId == null) continue
        const parent = byId.get(String(node.parentId))

        const data = {
            sourceName: parent?.name ?? '',
            targetName: node.name ?? '',
        }
        if (isConnector(node)) {
            data.noPlus = true
        }

        edges.push({
            id: `e-${node.parentId}-${node.id}`,
            source: String(node.parentId),
            target: String(node.id),
            data,
        })
    }

    return { nodes, edges }
}

export async function fetchPayload() {
    const stored = readStoredPayload()
    if (stored) return stored
    const res = await fetch('/payload.json')
    if (!res.ok) {
        throw new Error(`Failed to load payload.json (${res.status})`)
    }
    const payload = await res.json()
    savePayload(payload)
    return payload
}

export async function updatePayload(payload) {
    savePayload(payload)
    return payload
}
