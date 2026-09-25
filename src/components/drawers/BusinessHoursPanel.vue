<script setup>
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import TimezoneCombobox from '@/components/drawers/TimezoneCombobox.vue'
import { businessHoursSchema } from '@/utils/validation'

const props = defineProps({
    node: { type: Object, required: true },
})
const emit = defineEmits(['update', 'validity'])

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur'

const errors = computed(() => {
    const errs = {}
    for (const t of props.node.data.times ?? []) {
        const result = businessHoursSchema.safeParse(t)
        if (!result.success) {
            errs[t.day] = result.error.issues[0]?.message ?? 'Invalid time range'
        }
    }
    return errs
})

/** "HH:mm" payload string → { hours, minutes } for the picker's time-picker mode. */
function toPickerValue(hhmm) {
    const [hours, minutes] = (hhmm ?? '09:00').split(':').map(Number)
    return { hours: hours ?? 9, minutes: minutes ?? 0 }
}

/** { hours, minutes } → "HH:mm" for the payload. */
function fromPickerValue(value) {
    if (!value) return null
    const pad = (n) => String(n ?? 0).padStart(2, '0')
    return `${pad(value.hours)}:${pad(value.minutes)}`
}

const times = computed(() => {
    const map = new Map((props.node.data.times ?? []).map((t) => [t.day, t]))
    return DAYS.map((day) => map.get(day) ?? null)
})

function entryFor(day) {
    return times.value[DAYS.indexOf(day)]
}

function isEnabled(day) {
    return Boolean(entryFor(day))
}

function emitTimes(nextTimes) {
    emit('update', { ...props.node.data, times: nextTimes })
}

watchEffect(() => emit('validity', Object.keys(errors.value).length > 0))
onBeforeUnmount(() => emit('validity', false))

function toggleDay(day, enabled) {
    const existing = (props.node.data.times ?? []).filter((t) => t.day !== day)
    if (enabled) {
        existing.push({ day, startTime: '09:00', endTime: '17:00' })
    }
    const sorted = DAYS.flatMap((d) => existing.filter((t) => t.day === d))
    emitTimes(sorted)
}

function updateTime(day, field, value) {
    if (!value) return
    emitTimes(
        (props.node.data.times ?? []).map((t) => (t.day === day ? { ...t, [field]: value } : t)),
    )
}

function updateTimezone(value) {
    emit('update', { ...props.node.data, timezone: value })
}

const currentTimezone = computed(() => props.node.data.timezone ?? DEFAULT_TIMEZONE)
</script>

<template>
    <div class="flex flex-col gap-4">
        <div>
            <h3 class="text-sm font-medium">Business Hours</h3>
            <p class="text-xs text-muted-foreground">
                Set working hours per day. Success/Failure branches are evaluated from this
                schedule.
            </p>
        </div>

        <div class="flex flex-col gap-1.5">
            <div v-for="day in DAYS" :key="day" class="flex flex-col gap-0.5 pb-1">
                <div class="flex items-center gap-2">
                    <Switch
                        :model-value="isEnabled(day)"
                        :aria-label="`Enable ${day}`"
                        @update:model-value="(v) => toggleDay(day, v)"
                    />
                    <span class="w-9 text-xs font-medium capitalize">{{ day }}</span>
                    <template v-if="isEnabled(day)">
                        <div class="min-w-0 flex-1">
                            <VueDatePicker
                                time-picker
                                :is-24="true"
                                auto-apply
                                :clearable="false"
                                :teleport="true"
                                :model-value="toPickerValue(entryFor(day).startTime)"
                                :aria-label="`${day} start time`"
                                @update:model-value="
                                    (v) => updateTime(day, 'startTime', fromPickerValue(v))
                                "
                            />
                        </div>
                        <span class="text-xs text-muted-foreground">to</span>
                        <div class="min-w-0 flex-1">
                            <VueDatePicker
                                time-picker
                                :is-24="true"
                                auto-apply
                                :clearable="false"
                                :teleport="true"
                                :model-value="toPickerValue(entryFor(day).endTime)"
                                :aria-label="`${day} end time`"
                                @update:model-value="
                                    (v) => updateTime(day, 'endTime', fromPickerValue(v))
                                "
                            />
                        </div>
                    </template>
                    <span v-else class="flex-1 text-xs text-muted-foreground">Closed</span>
                </div>
                <p v-if="errors[day]" class="ml-16 text-[10px] text-destructive">
                    {{ errors[day] }}
                </p>
            </div>
        </div>

        <div class="flex flex-col gap-1.5">
            <Label for="timezone-select">Time Zone</Label>
            <TimezoneCombobox :model-value="currentTimezone" @update:model-value="updateTimezone" />
        </div>
    </div>
</template>
