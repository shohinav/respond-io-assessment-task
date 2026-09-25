<script setup>
import { Zap } from '@lucide/vue'
import NodeStub from '@/components/nodes/NodeStub.vue'

defineProps({
    data: { type: Object, required: true },
})
</script>

<template>
    <div class="relative">
        <div
            class="rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md w-56"
        >
            <div class="flex items-center gap-2 border-b border-border px-3 py-2">
                <span
                    class="flex size-5 shrink-0 items-center justify-center rounded bg-violet-100 text-violet-600"
                >
                    <Zap class="size-3.5" />
                </span>
                <span class="truncate text-xs font-semibold">Trigger</span>
            </div>
            <p class="min-h-10 px-3 py-2 text-left text-xs text-muted-foreground">
                {{ data.type === 'conversationOpened' ? 'Conversation Opened' : data.type }}
            </p>
        </div>
        <NodeStub
            v-if="data.isLeaf"
            :parent-id="String(data.raw?.id ?? '')"
            :parent-name="data.name ?? 'Trigger'"
        />
    </div>
</template>
