import { z } from 'zod'
import { isConnector, typeLabel } from '@/api/flowApi'

export const nameSchema = z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(60, 'Title must be 60 characters or fewer')

export const descriptionSchema = z
    .string()
    .trim()
    .max(200, 'Description must be 200 characters or fewer')
    .optional()
    .or(z.literal(''))

export const commentSchema = z
    .string()
    .trim()
    .max(500, 'Comment must be 500 characters or fewer')
    .optional()
    .or(z.literal(''))

export const messageTextSchema = z.string().max(1000, 'Message must be 1000 characters or fewer')

export const createNodeSchema = z.object({
    name: nameSchema,
    description: descriptionSchema,
    type: z.enum(['sendMessage', 'addComment', 'businessHours'], {
        message: 'Please select a node type',
    }),
})

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time')

export const businessHoursSchema = z
    .object({
        startTime: timeSchema,
        endTime: timeSchema,
    })
    .refine((t) => t.startTime < t.endTime, {
        message: 'End time must be after start time',
    })

export const timezoneSchema = z.string().min(1, 'Timezone is required')

/** Validate editable nodes with the same schemas used by the UI. */
export function validateFlow(payload) {
    const issues = []
    const add = (node, message) =>
        issues.push({ nodeId: node.id, nodeName: node.name || typeLabel(node.type), message })

    for (const node of payload ?? []) {
        if (node.type === 'trigger' || isConnector(node)) continue

        const name = nameSchema.safeParse(node.name ?? '')
        if (!name.success) add(node, name.error.issues[0]?.message ?? 'Invalid title')

        const description = descriptionSchema.safeParse(node.data?.description ?? '')
        if (!description.success)
            add(node, description.error.issues[0]?.message ?? 'Invalid description')

        if (node.type === 'addComment') {
            const comment = commentSchema.safeParse(node.data?.comment ?? '')
            if (!comment.success) add(node, comment.error.issues[0]?.message ?? 'Invalid comment')
        }

        if (node.type === 'sendMessage') {
            for (const item of node.data?.payload ?? []) {
                if (item.type !== 'text') continue
                const text = messageTextSchema.safeParse(item.text ?? '')
                if (!text.success) add(node, text.error.issues[0]?.message ?? 'Invalid message')
            }
        }

        if (node.type === 'dateTime') {
            for (const entry of node.data?.times ?? []) {
                const time = businessHoursSchema.safeParse(entry)
                if (!time.success) {
                    add(
                        node,
                        `${entry.day}: ${time.error.issues[0]?.message ?? 'Invalid time range'}`,
                    )
                }
            }
            const timezone = timezoneSchema.safeParse(node.data?.timezone ?? '')
            if (!timezone.success)
                add(node, timezone.error.issues[0]?.message ?? 'Invalid timezone')
        }
    }

    return issues
}

export function formatFlowIssues(issues) {
    const [first] = issues
    if (!first) return ''
    const more = issues.length > 1 ? ` (+${issues.length - 1} more)` : ''
    return `${first.nodeName}: ${first.message}${more}`
}
