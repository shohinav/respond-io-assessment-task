<script setup>
import { onBeforeUnmount, ref, watchEffect } from 'vue'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { commentSchema } from '@/utils/validation'

const props = defineProps({
    node: { type: Object, required: true },
})
const emit = defineEmits(['update', 'validity'])

const commentError = ref('')

const emitValidity = (hasErrors) => emit('validity', hasErrors)
watchEffect(() => emitValidity(Boolean(commentError.value)))
onBeforeUnmount(() => emitValidity(false))

function commit(newVal) {
    const { success, error } = commentSchema.safeParse(newVal)
    if (!success) {
        commentError.value = error.issues[0]?.message ?? 'Invalid comment'
        return
    }
    commentError.value = ''
    emit('update', { ...props.node.data, comment: newVal })
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
            <Label for="comment-text">Comment</Label>
            <Textarea
                id="comment-text"
                :model-value="props.node.data.comment ?? ''"
                rows="4"
                :aria-invalid="!!commentError"
                @update:model-value="commit"
            />
            <p v-if="commentError" class="text-xs text-destructive">
                {{ commentError }}
            </p>
        </div>
    </div>
</template>
