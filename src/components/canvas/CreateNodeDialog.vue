<script setup>
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { toast } from 'vue-sonner'
import { useFlowStore } from '@/stores/flow'
import { typeLabel } from '@/api/flowApi'
import { createNodeSchema } from '@/utils/validation'

const open = defineModel('open', { type: Boolean, default: false })

const props = defineProps({
    parentId: { type: String, default: null },
    afterId: { type: String, default: null },
})

const store = useFlowStore()

const parentName = computed(() => {
    if (!props.parentId) return null
    const parent = store.payload.find((n) => String(n.id) === String(props.parentId))
    if (!parent) return null
    return parent.name || typeLabel(parent.type)
})

const afterName = computed(() => {
    if (!props.afterId) return null
    const after = store.payload.find((n) => String(n.id) === String(props.afterId))
    if (!after) return null
    return after.name || typeLabel(after.type)
})

const description = computed(() => {
    if (parentName.value && afterName.value) {
        return `This step will be inserted between “${parentName.value}” and “${afterName.value}”.`
    }
    if (parentName.value) {
        return `This step will be added right below “${parentName.value}”.`
    }
    return 'No trigger step was found to attach to — the step will start unconnected; drag from the dots on its edges to connect it into the flow.'
})

const validationSchema = toTypedSchema(createNodeSchema)
const form = useForm({
    validationSchema,
    initialValues: { name: '', description: '', type: undefined },
})

const selectedType = ref('')

function onTypeChange(value) {
    selectedType.value = value
    form.setFieldValue('type', value)
}

watch(open, (isOpen) => {
    if (isOpen) {
        selectedType.value = ''
        form.resetForm()
    }
})

async function onSubmit() {
    const { valid, values } = await form.validate()
    if (!valid) return
    const { name, description, type } = values

    store.addNode({
        type,
        name,
        description,
        parentId: props.parentId ?? null,
        childId: props.afterId ?? null,
    })
    form.resetForm()
    open.value = false
    toast.info('Step added — press Save to keep it')
}
</script>

<template>
    <Dialog :open="open" @update:open="open = $event">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add New Step</DialogTitle>
                <DialogDescription>
                    {{ description }}
                </DialogDescription>
            </DialogHeader>

            <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
                <FormField
                    v-slot="{ componentField }"
                    name="name"
                    :validate-on-blur="false"
                    :validate-on-input="false"
                    :validate-on-change="false"
                    :validate-on-model-update="false"
                >
                    <FormItem>
                        <Label for="create-name">Title</Label>
                        <FormControl>
                            <Input
                                id="create-name"
                                placeholder="e.g. Follow-up Message"
                                v-bind="componentField"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </FormField>

                <FormField
                    v-slot="{ componentField }"
                    name="description"
                    :validate-on-blur="false"
                    :validate-on-input="false"
                    :validate-on-change="false"
                    :validate-on-model-update="false"
                >
                    <FormItem>
                        <Label for="create-description">Description (optional)</Label>
                        <FormControl>
                            <Textarea
                                id="create-description"
                                rows="2"
                                placeholder="When is this step used?"
                                v-bind="componentField"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </FormField>

                <FormField
                    v-slot="{ errorMessage: error }"
                    name="type"
                    :validate-on-blur="false"
                    :validate-on-input="false"
                    :validate-on-change="false"
                    :validate-on-model-update="false"
                >
                    <FormItem>
                        <Label for="create-type">Type</Label>
                        <Select :model-value="selectedType" @update:model-value="onTypeChange">
                            <FormControl class="w-full">
                                <SelectTrigger id="create-type" :aria-invalid="!!error">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="sendMessage">Send Message</SelectItem>
                                <SelectItem value="addComment">Add Comments</SelectItem>
                                <SelectItem value="businessHours">Business Hours</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                </FormField>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="open = false"> Cancel </Button>
                    <Button type="submit">Add Step</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
