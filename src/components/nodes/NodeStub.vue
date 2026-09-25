<script setup>
import { inject } from 'vue'
import { Plus } from '@lucide/vue'

defineProps({
    parentId: { type: String, required: true },
    parentName: { type: String, default: '' },
})

const onPlusClick = inject('onPlusClick', () => {})
</script>

<template>
    <div
        class="nodrag absolute left-1/2 top-full -translate-x-1/2 flex flex-col items-center"
        @click.stop
    >
        <span class="nodrag nopan block h-20 w-px bg-slate-300" aria-hidden="true" />
        <button
            type="button"
            class="flex size-4.5 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm transition-colors hover:bg-slate-50 nodrag nopan -mt-px"
            :aria-label="`Add a step after ${parentName || parentId}`"
            title="Add a step here"
            @click.stop="onPlusClick({ source: parentId })"
        >
            <Plus class="size-3 text-slate-500" />
        </button>
    </div>
</template>
