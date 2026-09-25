<script setup>
import { computed, inject } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'
import { Plus } from '@lucide/vue'

const props = defineProps({
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    data: { type: Object, default: () => ({}) },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    markerEnd: { type: String, default: undefined },
})

const onPlusClick = inject('onPlusClick', () => {})

const path = computed(() => {
    const [d, labelX, labelY] = getSmoothStepPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY,
        sourcePosition: props.sourcePosition,
        targetPosition: props.targetPosition,
        borderRadius: 8,
    })
    return { d, labelX, labelY }
})

const showPlus = computed(() => !props.data?.noPlus)

const sourceLabel = computed(() => props.data?.sourceName || props.source)
const targetLabel = computed(() => props.data?.targetName || props.target)
</script>

<script>
export default {
    inheritAttrs: false,
}
</script>

<template>
    <BaseEdge :id="id" :path="path.d" :marker-end="markerEnd" />

    <EdgeLabelRenderer>
        <div
            v-if="showPlus"
            class="nodrag nopan"
            :style="{
                pointerEvents: 'all',
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${path.labelX}px, ${path.labelY}px)`,
            }"
        >
            <button
                type="button"
                class="flex size-4.5 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors border-slate-300 hover:bg-slate-50"
                :aria-label="`Add a step between ${sourceLabel} and ${targetLabel}`"
                title="Add a step in between"
                @click.stop="onPlusClick({ source: source, target: target })"
            >
                <Plus class="size-3 text-slate-500" />
            </button>
        </div>
    </EdgeLabelRenderer>
</template>
