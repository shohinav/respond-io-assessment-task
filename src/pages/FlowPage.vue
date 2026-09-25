<script setup>
import { markRaw, provide, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { toast } from 'vue-sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useFlowStore } from '@/stores/flow'
import { useFlowPayload, useUpdateFlowMutation } from '@/composables/useFlowQueries'
import TriggerNode from '@/components/nodes/TriggerNode.vue'
import SendMessageNode from '@/components/nodes/SendMessageNode.vue'
import AddCommentNode from '@/components/nodes/AddCommentNode.vue'
import BusinessHoursNode from '@/components/nodes/BusinessHoursNode.vue'
import DateTimeConnectorNode from '@/components/nodes/DateTimeConnectorNode.vue'
import PlusEdge from '@/components/canvas/PlusEdge.vue'
import DetailsDrawer from '@/components/drawers/DetailsDrawer.vue'
import CreateNodeDialog from '@/components/canvas/CreateNodeDialog.vue'
import FlowHeader from '@/components/canvas/FlowHeader.vue'
import { Button } from '@/components/ui/button'
import { validateFlow, formatFlowIssues } from '@/utils/validation'

// Vue Flow stores component objects; keep them out of Vue reactivity.
const nodeTypes = {
    trigger: markRaw(TriggerNode),
    sendMessage: markRaw(SendMessageNode),
    addComment: markRaw(AddCommentNode),
    dateTime: markRaw(BusinessHoursNode),
    dateTimeConnector: markRaw(DateTimeConnectorNode),
}

const edgeTypes = {
    plus: markRaw(PlusEdge),
}

const store = useFlowStore()
const { onNodeDragStop, onConnect } = useVueFlow()

const createNodeOpen = ref(false)
const createParentId = ref(null)
const createAfterId = ref(null)

function requestAddStep(source) {
    const create = source ?? { source: store.payload.at(-1)?.id ?? null }
    createParentId.value = create.source != null ? String(create.source) : null
    createAfterId.value = create.target != null ? String(create.target) : null
    createNodeOpen.value = true
}

provide('onPlusClick', requestAddStep)

const { data, isLoading, error } = useFlowPayload()
let hydrated = false
watch(
    data,
    (payload) => {
        if (hydrated || !payload) return
        hydrated = true
        store.setPayload(payload)
    },
    { immediate: true },
)

const { mutate: persist } = useUpdateFlowMutation()

onConnect((connection) => {
    const result = store.connectNodes(connection.target, connection.source)
    if (result === 'self') {
        toast.error('A step can not be connected to itself')
        return
    }
    if (result === 'cycle') {
        toast.error('That connection would create a loop')
    }
})

onNodeDragStop(({ nodes: draggedNodes }) => {
    const positions = {}
    for (const node of draggedNodes) {
        positions[node.id] = node.position
    }
    store.updateNodePositions(positions)
})

const selectedNodeId = ref(null)
const detailsDrawerRef = ref(null)
const pendingNodeId = ref(null)

function openNodeDetails(nodeId) {
    const nextNodeId = String(nodeId)
    if (selectedNodeId.value === nextNodeId) return

    if (detailsDrawerRef.value?.isDirty()) {
        pendingNodeId.value = nextNodeId
        detailsDrawerRef.value.requestClose()
        return
    }

    selectedNodeId.value = nextNodeId
}
provide('openNodeDetails', openNodeDetails)

function handleNodeClick({ node }) {
    if (node.selectable === false) return
    openNodeDetails(node.id)
}

function handleDrawerClose({ reason } = {}) {
    const nextNodeId = pendingNodeId.value
    pendingNodeId.value = null

    if (nextNodeId && (reason === 'save' || reason === 'discard')) {
        selectedNodeId.value = nextNodeId
        return
    }

    selectedNodeId.value = null
}

// Reloads get a modal with Save / Discard / Cancel.
const refreshGuardOpen = ref(false)

function cancelGuard() {
    refreshGuardOpen.value = false
}

function discardGuardChanges() {
    cancelGuard()
    store.discardChanges()
    window.location.reload()
}

function saveGuardChanges() {
    if (!store.isDirty) {
        cancelGuard()
        window.location.reload()
        return
    }
    const issues = validateFlow(store.payload)
    if (issues.length) {
        toast.error(`Fix validation errors before saving — ${formatFlowIssues(issues)}`)
        return
    }
    persist(store.payload, {
        onSuccess: () => {
            toast.success('Flow saved')
            cancelGuard()
            window.location.reload()
        },
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
    })
}

function onKeyDown(event) {
    const isReload =
        event.key === 'F5' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r')
    if (!isReload) return
    if (store.isDirty) {
        event.preventDefault()
        refreshGuardOpen.value = true
    }
}

useEventListener(window, 'keydown', onKeyDown)

function onBeforeUnload(event) {
    if (!store.isDirty) return
    event.preventDefault()
    event.returnValue = ''
}

useEventListener(window, 'beforeunload', onBeforeUnload)

function onUndoRedoKeydown(event) {
    const t = event.target
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable)
        return
    if (!(event.metaKey || event.ctrlKey)) return

    const key = event.key.toLowerCase()
    if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
            store.redo()
        } else {
            store.undo()
        }
    } else if (key === 'y') {
        event.preventDefault()
        store.redo()
    }
}
useEventListener(window, 'keydown', onUndoRedoKeydown)
</script>

<template>
    <div class="flex h-screen flex-col bg-background">
        <FlowHeader @create="requestAddStep(null)" />

        <div class="relative flex-1 overflow-hidden">
            <VueFlow
                v-if="store.nodes.length"
                :nodes="store.nodes"
                :edges="store.edges"
                :node-types="nodeTypes"
                :edge-types="edgeTypes"
                :default-edge-options="{ type: 'plus' }"
                :min-zoom="0.25"
                :max-zoom="1.75"
                fit-view-on-init
                @node-click="handleNodeClick"
            >
                <Background :gap="16" />
                <Controls position="bottom-left" :show-interactive="false" />
            </VueFlow>

            <div
                v-else-if="isLoading"
                class="flex h-full items-center justify-center text-sm text-muted-foreground"
            >
                Loading flow…
            </div>

            <div v-else-if="error" class="flex h-full flex-col items-center justify-center gap-2">
                <p class="text-sm text-destructive">Failed to load the flow payload.</p>
                <p class="text-xs text-muted-foreground">{{ error.message }}</p>
            </div>

            <CreateNodeDialog
                v-model:open="createNodeOpen"
                :parent-id="createParentId"
                :after-id="createAfterId"
            />
            <DetailsDrawer
                ref="detailsDrawerRef"
                :node-id="selectedNodeId"
                @close="handleDrawerClose"
            />

            <Dialog :open="refreshGuardOpen" @update:open="(open) => !open && cancelGuard()">
                <DialogContent class="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unsaved changes</DialogTitle>
                        <DialogDescription>
                            You have unsaved changes that will be lost if you reload now. Save them
                            first, or discard them.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter class="gap-2 justify-end">
                        <Button variant="ghost" @click="discardGuardChanges">
                            Discard changes
                        </Button>
                        <Button @click="saveGuardChanges">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
</template>
