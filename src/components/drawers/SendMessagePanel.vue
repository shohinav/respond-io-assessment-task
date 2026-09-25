<script setup>
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, FileText } from '@lucide/vue'
import { messageTextSchema } from '@/utils/validation'

const props = defineProps({
    node: { type: Object, required: true },
})
const emit = defineEmits(['update', 'remove-attachment', 'validity', 'attachment-error'])

const fileInput = ref(null)
const textError = ref('')

// Attachments are stored inside localStorage so ~5 MB total limit
const MAX_ATTACHMENT_BYTES = 1024 * 1024

const emitValidity = (hasErrors) => emit('validity', hasErrors)
watchEffect(() => emitValidity(Boolean(textError.value)))
onBeforeUnmount(() => emitValidity(false))

const textItem = computed(() =>
    (props.node.data.payload ?? []).find((item) => item.type === 'text'),
)

const attachments = computed(() =>
    (props.node.data.payload ?? [])
        .map((item, payloadIndex) => ({ item, payloadIndex }))
        .filter(({ item }) => item.type === 'attachment')
        .map((entry, attachmentIndex) => ({ ...entry, attachmentIndex })),
)

function commitText(newVal) {
    const { success, error } = messageTextSchema.safeParse(newVal)
    if (!success) {
        textError.value = error.issues[0]?.message ?? 'Invalid message'
        return
    }
    textError.value = ''
    const items = (props.node.data.payload ?? []).filter((item) => item.type !== 'text')
    if (newVal.trim() !== '') {
        items.unshift({ type: 'text', text: newVal })
    }
    emit('update', { ...props.node.data, payload: items })
}

function removeAttachment(payloadIndex, name) {
    emit('remove-attachment', { payloadIndex, name })
}

function triggerUpload() {
    fileInput.value?.click()
}

function onFilesSelected(event) {
    const files = Array.from(event.target.files ?? [])
    for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
            emit('attachment-error', `“${file.name}” is larger than 1 MB and was not added.`)
            continue
        }
        const reader = new FileReader()
        reader.onload = () => {
            emit('update', {
                ...props.node.data,
                payload: [
                    ...(props.node.data.payload ?? []),
                    { type: 'attachment', attachment: reader.result, name: file.name },
                ],
            })
        }
        reader.onerror = () => emit('attachment-error', `Could not read “${file.name}”.`)
        reader.readAsDataURL(file)
    }
    event.target.value = ''
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
            <Label for="message-text">Message</Label>
            <Textarea
                id="message-text"
                :model-value="textItem?.text ?? ''"
                rows="4"
                @update:model-value="commitText"
            />
            <p v-if="textError" class="text-xs text-destructive">{{ textError }}</p>
        </div>

        <div class="flex flex-col gap-2">
            <Label>Attachments</Label>
            <div v-if="attachments.length" class="grid grid-cols-2 gap-2">
                <div
                    v-for="{ item, payloadIndex, attachmentIndex } in attachments"
                    :key="payloadIndex"
                    class="group relative overflow-hidden rounded-md border bg-muted/40"
                >
                    <img
                        :src="item.attachment"
                        :alt="item.name ?? 'attachment'"
                        class="aspect-video w-full object-cover"
                    />
                    <div class="flex items-center gap-1 px-2 py-1">
                        <FileText class="size-3 shrink-0 text-muted-foreground" />
                        <span class="truncate text-[10px] text-muted-foreground">
                            {{ item.name ?? 'attachment' }}
                        </span>
                    </div>
                    <button
                        type="button"
                        class="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-destructive hover:text-white"
                        :aria-label="`Remove attachment ${attachmentIndex + 1}`"
                        @click="removeAttachment(payloadIndex, item.name)"
                    >
                        <X class="size-3" />
                    </button>
                </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">No attachments yet.</p>

            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="onFilesSelected"
            />
            <Button variant="outline" size="sm" @click="triggerUpload">
                <Upload class="size-4" />
                Upload Attachment
            </Button>
            <p class="text-[10px] text-muted-foreground">
                Images up to 1 MB, stored in your browser.
            </p>
        </div>
    </div>
</template>
