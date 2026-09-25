<script setup>
import { Handle, Position } from '@vue-flow/core'
import NodeStub from '@/components/nodes/NodeStub.vue'

/** Display-only Success/Failure branch pill. */
defineProps({
    data: { type: Object, required: true },
})
</script>

<template>
    <div class="relative">
        <Handle type="target" :position="Position.Top" />
        <Handle type="source" :position="Position.Bottom" />
        <div
            class="flex h-6 items-center justify-center rounded-full border bg-card px-3 text-[10px] font-medium shadow-sm"
            :class="
                data.connectorType === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border-red-200 bg-red-50 text-red-600'
            "
        >
            {{ data.connectorType === 'success' ? 'Success' : 'Failure' }}
        </div>
        <!-- Empty branches use a node stub; occupied branches use their edge ⊕. -->
        <NodeStub
            v-if="data.isLeaf"
            :parent-id="String(data.raw?.id ?? '')"
            :parent-name="data.name ?? 'this branch'"
        />
    </div>
</template>
