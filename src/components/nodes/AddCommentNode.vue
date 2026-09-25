<script setup>
import { inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { MessageSquarePlus } from '@lucide/vue'
import NodeStub from '@/components/nodes/NodeStub.vue'

const props = defineProps({
    data: { type: Object, required: true },
})

const openNodeDetails = inject('openNodeDetails', null)
const nodeId = String(props.data.raw?.id ?? '')
</script>

<template>
    <div class="relative">
        <Handle type="target" :position="Position.Top" />
        <Handle
            type="source"
            :position="Position.Bottom"
            :class="{ 'handle-hidden': !data.isLeaf }"
        />
        <div
            class="rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none w-60"
            tabindex="0"
            role="button"
            :aria-label="`Open details for ${data.name || 'Add Comment'}`"
            @keydown.enter.prevent="openNodeDetails?.(nodeId)"
            @keydown.space.prevent="openNodeDetails?.(nodeId)"
        >
            <div class="flex items-center gap-2 border-b border-border px-3 py-2">
                <span
                    class="flex size-5 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-600"
                >
                    <MessageSquarePlus class="size-3.5" />
                </span>
                <span class="truncate text-xs font-semibold">{{ data.name }}</span>
            </div>
            <div class="min-h-10 px-3 py-2 text-left text-xs text-muted-foreground space-y-1">
                <p v-if="data.description" class="line-clamp-1 text-foreground/70">
                    {{ data.description }}
                </p>
                <p
                    class="text-left italic text-muted-foreground"
                    :class="data.description ? 'line-clamp-1' : 'line-clamp-3'"
                >
                    {{ data.comment || 'No comment yet' }}
                </p>
            </div>
        </div>
        <NodeStub
            v-if="data.isLeaf"
            :parent-id="String(data.raw?.id ?? '')"
            :parent-name="data.name ?? ''"
        />
    </div>
</template>
