<script setup>
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Clock } from '@lucide/vue'
import NodeStub from '@/components/nodes/NodeStub.vue'

const props = defineProps({
    data: { type: Object, required: true },
})

const openNodeDetails = inject('openNodeDetails', null)
const nodeId = String(props.data.raw?.id ?? '')

const timezone = computed(() => props.data.timezone ?? 'UTC')

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const fmtDay = (day) => day[0].toUpperCase() + day.slice(1, 3)

const scheduleSummary = computed(() => {
    const entries = [...(props.data.times ?? [])].sort(
        (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day),
    )
    if (!entries.length) return 'Closed all week'

    const groups = []
    for (const entry of entries) {
        const last = groups.at(-1)
        if (last && DAYS.indexOf(entry.day) === DAYS.indexOf(last.days.at(-1).day) + 1) {
            last.days.push(entry)
        } else {
            groups.push({ days: [entry] })
        }
    }
    const range = groups
        .map((g) =>
            g.days.length === 1
                ? fmtDay(g.days[0].day)
                : `${fmtDay(g.days[0].day)}–${fmtDay(g.days.at(-1).day)}`,
        )
        .join(', ')
    const times = [...new Set(entries.map((t) => `${t.startTime}–${t.endTime}`))]
    return `${range} · ${times.join(', ')}`
})
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
            class="rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none w-64 border-orange-200"
            tabindex="0"
            role="button"
            :aria-label="`Open details for ${data.name || 'Business Hours'}`"
            @keydown.enter.prevent="openNodeDetails?.(nodeId)"
            @keydown.space.prevent="openNodeDetails?.(nodeId)"
        >
            <div class="flex items-center gap-2 border-b border-border px-3 py-2">
                <span
                    class="flex size-5 shrink-0 items-center justify-center rounded bg-orange-100 text-orange-500"
                >
                    <Clock class="size-3.5" />
                </span>
                <span class="truncate text-xs font-semibold">{{ data.name }}</span>
            </div>
            <div class="min-h-10 px-3 py-2 text-left text-xs text-muted-foreground space-y-1">
                <p v-if="data.description" class="line-clamp-1 text-foreground/70">
                    {{ data.description }}
                </p>
                <p class="line-clamp-1 italic">{{ scheduleSummary }} · {{ timezone }}</p>
            </div>
        </div>
        <NodeStub
            v-if="data.isLeaf"
            :parent-id="String(data.raw?.id ?? '')"
            :parent-name="data.name ?? ''"
        />
    </div>
</template>
