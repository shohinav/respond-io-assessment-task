<script setup>
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Trash2, Save } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useFlowStore } from '@/stores/flow'
import { useUpdateFlowMutation } from '@/composables/useFlowQueries'
import { nameSchema, descriptionSchema, validateFlow, formatFlowIssues } from '@/utils/validation'
import { typeLabel as typeLabelFor } from '@/api/flowApi'
import SendMessagePanel from '@/components/drawers/SendMessagePanel.vue'
import AddCommentPanel from '@/components/drawers/AddCommentPanel.vue'
import BusinessHoursPanel from '@/components/drawers/BusinessHoursPanel.vue'

const props = defineProps({
    nodeId: { type: String, default: null },
})
const emit = defineEmits(['close'])

const store = useFlowStore()
const { mutate: persist } = useUpdateFlowMutation()

const node = computed(() =>
    props.nodeId ? store.payload.find((n) => String(n.id) === String(props.nodeId)) : null,
)
const isOpen = computed(() => Boolean(node.value))

const draftData = ref({})
const baseSnapshot = ref('')
const confirmOpen = ref(false)
const deleteOpen = ref(false)
const panelHasErrors = ref(false)
const pendingAttachment = ref(null)

const validationSchema = toTypedSchema(
    z.object({
        name: nameSchema,
        description: descriptionSchema,
    }),
)

const form = useForm({
    validationSchema,
    initialValues: { name: '', description: '' },
})

function draftSnapshot(name, description, data) {
    return JSON.stringify({ name, description, data })
}

const drawerDirty = computed(
    () =>
        Boolean(node.value) &&
        baseSnapshot.value !== '' &&
        draftSnapshot(form.values.name ?? '', form.values.description ?? '', draftData.value) !==
            baseSnapshot.value,
)

watch(
    () => props.nodeId,
    () => {
        form.resetForm()
        confirmOpen.value = false
        panelHasErrors.value = false
        pendingAttachment.value = null

        if (!node.value) {
            baseSnapshot.value = ''
            draftData.value = {}
            return
        }

        const description = node.value.data?.description ?? ''
        form.setValues({ name: node.value.name ?? '', description })
        draftData.value = JSON.parse(JSON.stringify(node.value.data ?? {}))
        baseSnapshot.value = draftSnapshot(node.value.name ?? '', description, draftData.value)
    },
    { immediate: true },
)

const draftNode = computed(() => (node.value ? { ...node.value, data: draftData.value } : null))

function updateData(dataPatch) {
    if (!node.value) return
    draftData.value = { ...draftData.value, ...dataPatch }
}

async function saveAndPersist() {
    if (!node.value) return false

    const { valid } = await form.validate()
    if (!valid) return false
    if (!drawerDirty.value) {
        toast.info('Nothing to save')
        return false
    }
    if (panelHasErrors.value) {
        toast.error('Fix the highlighted validation errors before saving')
        return false
    }

    const name = (form.values.name ?? '').trim()
    const description = (form.values.description ?? '').trim()
    const nextData = { ...draftData.value, description }
    const nextPayload = store.payload.map((item) =>
        String(item.id) === String(node.value.id) ? { ...item, name, data: nextData } : item,
    )
    const issues = validateFlow(nextPayload)
    if (issues.length) {
        toast.error(`Fix validation errors before saving — ${formatFlowIssues(issues)}`)
        return false
    }

    store.updateNode(node.value.id, {
        name,
        data: nextData,
    })

    persist(store.payload, {
        onSuccess: () => {
            toast.success('Step saved')
            emit('close', { reason: 'save' })
        },
        onError: (err) => {
            store.undo()
            toast.error(`Failed to save: ${err.message}`)
        },
    })
    return true
}

function requestClose() {
    if (drawerDirty.value) {
        confirmOpen.value = true
        return
    }
    emit('close')
}

function cancelClose() {
    confirmOpen.value = false
}

function leaveWithoutSaving() {
    confirmOpen.value = false
    toast.info('Changes discarded')
    emit('close', { reason: 'discard' })
}

function saveAndClose() {
    confirmOpen.value = false
    saveAndPersist()
}

function deleteNode() {
    if (!node.value) return
    store.deleteNode(node.value.id)
    deleteOpen.value = false
    emit('close', { reason: 'delete' })
    toast.info('Step deleted — press Save to keep it')
}

const panelByType = {
    sendMessage: SendMessagePanel,
    addComment: AddCommentPanel,
    dateTime: BusinessHoursPanel,
}

function isDirty() {
    return drawerDirty.value
}

defineExpose({ requestClose, isDirty })

const typeLabel = typeLabelFor

const attachmentConfirmOpen = computed(() => Boolean(pendingAttachment.value))

function requestRemoveAttachment(attachment) {
    pendingAttachment.value = attachment
}

function confirmRemoveAttachment() {
    const pending = pendingAttachment.value
    pendingAttachment.value = null
    if (!node.value || !pending) return
    updateData({
        ...draftData.value,
        payload: (draftData.value.payload ?? []).filter((_, i) => i !== pending.payloadIndex),
    })
    toast.success('Attachment removed')
}
</script>

<template>
    <Sheet :open="isOpen" :modal="false" @update:open="(v) => !v && requestClose()">
        <SheetContent
            side="right"
            class="w-full gap-0 overflow-y-auto sm:max-w-md"
            @pointer-down-outside.prevent
            @interact-outside.prevent
        >
            <template v-if="node">
                <SheetHeader class="pb-4">
                    <SheetTitle class="flex items-center gap-2 truncate text-base">
                        <span class="truncate">{{ form.values.name || 'Untitled step' }}</span>
                        <span
                            v-if="drawerDirty"
                            class="flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-600"
                        >
                            <span class="size-1.5 rounded-full bg-amber-500" />
                            Unsaved
                        </span>
                    </SheetTitle>
                    <SheetDescription class="flex items-center gap-2">
                        <Badge variant="secondary" class="text-[10px] font-medium">
                            {{ typeLabel(node.type) }}
                        </Badge>
                        <span class="font-mono text-[10px] text-muted-foreground">
                            #{{ node.id }}
                        </span>
                        <span class="sr-only">Press save to apply your changes</span>
                    </SheetDescription>
                </SheetHeader>

                <div class="flex flex-col gap-5 px-4 pb-8">
                    <form class="flex flex-col gap-4" @submit.prevent="saveAndPersist">
                        <FormField
                            v-slot="{ componentField, errorMessage: error }"
                            name="name"
                            :validate-on-blur="false"
                            :validate-on-input="false"
                            :validate-on-change="false"
                            :validate-on-model-update="false"
                        >
                            <FormItem>
                                <Label for="node-name">Title</Label>
                                <FormControl>
                                    <Input
                                        id="node-name"
                                        v-bind="componentField"
                                        :aria-invalid="!!error"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        </FormField>

                        <FormField
                            v-slot="{ componentField, errorMessage: error }"
                            name="description"
                            :validate-on-blur="false"
                            :validate-on-input="false"
                            :validate-on-change="false"
                            :validate-on-model-update="false"
                        >
                            <FormItem>
                                <Label for="node-description">Description (optional)</Label>
                                <FormControl>
                                    <Textarea
                                        id="node-description"
                                        v-bind="componentField"
                                        :aria-invalid="!!error"
                                        rows="2"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        </FormField>
                    </form>

                    <Separator />

                    <component
                        :is="panelByType[node.type]"
                        v-if="panelByType[node.type]"
                        :key="node.id"
                        :node="draftNode"
                        @update="updateData"
                        @remove-attachment="requestRemoveAttachment"
                        @validity="panelHasErrors = $event"
                        @attachment-error="toast.error($event)"
                    />

                    <Separator />

                    <div class="flex flex-col gap-2">
                        <Button class="w-full" @click="saveAndPersist">
                            <Save class="size-4" />
                            Save
                        </Button>

                        <Button variant="destructive" class="w-full" @click="deleteOpen = true">
                            <Trash2 class="size-4" />
                            Delete Step
                        </Button>
                    </div>
                </div>
            </template>
        </SheetContent>

        <AlertDialog v-model:open="deleteOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this step?</AlertDialogTitle>
                    <AlertDialogDescription>
                        “{{ node?.name }}” will be removed from the flow. Everything connected below
                        it stays in place. You can undo this.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-white hover:bg-destructive/90"
                        @click="deleteNode"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog v-model:open="attachmentConfirmOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
                    <AlertDialogDescription>
                        “{{ pendingAttachment?.name ?? 'This attachment' }}” will be removed from
                        this step. Remember to save.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="confirmRemoveAttachment"> Remove </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog v-model:open="confirmOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes on this step. Do you want to save them before
                        closing?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="ghost" @click="cancelClose">Keep editing</Button>
                    <Button variant="outline" @click="leaveWithoutSaving">
                        Leave without saving
                    </Button>
                    <Button @click="saveAndClose">Save Changes</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Sheet>
</template>
