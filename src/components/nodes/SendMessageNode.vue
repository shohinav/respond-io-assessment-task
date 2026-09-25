<script setup>
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Send } from '@lucide/vue'
import NodeStub from '@/components/nodes/NodeStub.vue'

const props = defineProps({
    data: { type: Object, required: true },
})

const openNodeDetails = inject('openNodeDetails', null)
const nodeId = String(props.data.raw?.id ?? '')

const texts = computed(() => (props.data.payload ?? []).filter((item) => item.type === 'text'))
const attachments = computed(() =>
    (props.data.payload ?? []).filter((item) => item.type === 'attachment'),
)
const attachmentNames = computed(() =>
    attachments.value.map(
        (item) => item.name ?? decodeURIComponent((item.attachment ?? '').split('/').pop() ?? ''),
    ),
)
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
            :aria-label="`Open details for ${data.name || 'Send Message'}`"
            @keydown.enter.prevent="openNodeDetails?.(nodeId)"
            @keydown.space.prevent="openNodeDetails?.(nodeId)"
        >
            <div class="flex items-center gap-2 border-b border-border px-3 py-2">
                <span
                    class="flex size-5 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-600"
                >
                    <Send class="size-3.5" />
                </span>
                <span class="truncate text-xs font-semibold">{{ data.name }}</span>
                <span
                    v-if="attachments.length"
                    class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                    {{ attachments.length }} 📎
                </span>
            </div>
            <div class="min-h-10 px-3 py-2 text-left text-xs text-muted-foreground space-y-1">
                <p v-if="data.description" class="line-clamp-1 text-foreground/70">
                    {{ data.description }}
                </p>
                <p class="text-[11px] font-medium text-foreground/60">Message:</p>
                <p
                    v-for="(text, i) in texts"
                    :key="i"
                    class="text-left italic text-muted-foreground"
                    :class="data.description ? 'line-clamp-1' : 'line-clamp-3'"
                >
                    {{ text.text }}
                </p>
                <p v-if="attachmentNames.length" class="line-clamp-1 italic text-muted-foreground">
                    {{ attachmentNames.join(', ') }}
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
