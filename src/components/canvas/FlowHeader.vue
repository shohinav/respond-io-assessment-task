<script setup>
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Undo2, Redo2, Plus, RotateCcw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useFlowStore } from '@/stores/flow'
import { useUpdateFlowMutation } from '@/composables/useFlowQueries'
import { clearPayload, isConnector } from '@/api/flowApi'
import { validateFlow, formatFlowIssues } from '@/utils/validation'

const store = useFlowStore()
defineEmits(['create'])
const { mutate } = useUpdateFlowMutation()

const GITHUB_URL = 'https://github.com/shohinav/respond-io-assessment-task-draft'

const stepCount = computed(() => store.payload.filter((n) => !isConnector(n)).length)

const resetConfirmOpen = ref(false)

function save() {
    if (!store.isDirty) {
        toast.info('Nothing to save')
        return
    }
    const issues = validateFlow(store.payload)
    if (issues.length) {
        toast.error(`Fix validation errors before saving — ${formatFlowIssues(issues)}`)
        return
    }
    mutate(store.payload, {
        onSuccess: () => toast.success('Flow saved'),
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
    })
}

function reset() {
    resetConfirmOpen.value = false
    clearPayload()
    store.markSaved()
    toast.success('Flow reset to the original payload — reloading…', {
        duration: 1000,
    })
    setTimeout(() => window.location.reload(), 1000)
}
</script>

<template>
    <header class="flex h-14 items-center justify-between border-b bg-card px-4">
        <div class="flex items-center gap-3">
            <h1 class="text-sm font-semibold">Flow Builder</h1>
            <Badge variant="secondary" class="font-mono text-xs"> {{ stepCount }} steps </Badge>
            <span
                v-if="store.isDirty"
                class="flex items-center gap-1 text-[10px] font-medium text-amber-600"
            >
                <span class="size-1.5 rounded-full bg-amber-500" />
                Unsaved changes
            </span>
        </div>

        <div class="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                :disabled="!store.canUndo"
                title="Undo (Ctrl+Z)"
                @click="store.undo()"
            >
                <Undo2 class="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                :disabled="!store.canRedo"
                title="Redo (Ctrl+Shift+Z)"
                @click="store.redo()"
            >
                <Redo2 class="size-4" />
            </Button>
            <AlertDialog v-model:open="resetConfirmOpen">
                <AlertDialogTrigger as-child>
                    <Button variant="ghost" size="icon" title="Reset to original payload">
                        <RotateCcw class="size-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset to the original payload?</AlertDialogTitle>
                        <AlertDialogDescription>
                            All local changes (new steps, edits, positions) will be discarded and
                            the flow reloaded from payload.json.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            class="bg-destructive text-white hover:bg-destructive/90"
                            @click="reset"
                        >
                            Reset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" title="Add a step below the last node" @click="$emit('create')">
                <Plus class="size-4" />
                Add New Step
            </Button>
            <Button size="sm" variant="outline" @click="save">Save</Button>
            <Button as-child variant="ghost" size="icon">
                <a
                    :href="GITHUB_URL"
                    target="_blank"
                    rel="noreferrer"
                    title="View source on GitHub"
                    aria-label="View source on GitHub"
                >
                    <svg viewBox="0 0 16 16" fill="currentColor" class="size-4" aria-hidden="true">
                        <path
                            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                        />
                    </svg>
                </a>
            </Button>
        </div>
    </header>
</template>
