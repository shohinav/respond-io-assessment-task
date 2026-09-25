<script setup>
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, MapPin } from '@lucide/vue'
import { timezoneOptions } from '@/utils/timezones'

const props = defineProps({
    modelValue: { type: String, required: true },
    compact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const TIMEZONES = timezoneOptions()
const open = ref(false)

const label = computed(
    () => TIMEZONES.find((tz) => tz.value === props.modelValue)?.label ?? props.modelValue,
)
const city = computed(() => {
    const parts = props.modelValue.split('/')
    return parts[parts.length - 1].replace(/_/g, ' ')
})

function select(value) {
    emit('update:modelValue', value)
    open.value = false
}
</script>

<template>
    <Popover v-model:open="open">
        <PopoverTrigger as-child>
            <Button
                v-if="compact"
                variant="ghost"
                size="sm"
                class="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                :title="label"
            >
                <MapPin class="size-3" />
                {{ city }}
                <ChevronsUpDown class="size-3 opacity-50" />
            </Button>
            <Button v-else variant="outline" class="w-full justify-between font-normal">
                <span class="truncate">{{ label }}</span>
                <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[calc(var(--reka-popper-anchor-width)+2rem)] p-0" align="start">
            <Command>
                <CommandInput placeholder="Search timezone or city…" />
                <CommandEmpty>No matching time zone.</CommandEmpty>
                <CommandList class="max-h-64">
                    <CommandGroup>
                        <CommandItem
                            v-for="tz in TIMEZONES"
                            :key="tz.value"
                            :value="tz.label"
                            @select="() => select(tz.value)"
                        >
                            <Check
                                class="mr-1 size-4"
                                :class="tz.value === props.modelValue ? 'opacity-100' : 'opacity-0'"
                            />
                            {{ tz.label }}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
</template>
