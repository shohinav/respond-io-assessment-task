import { describe, it, expect } from 'vitest'
import {
    createNodeSchema,
    businessHoursSchema,
    validateFlow,
    formatFlowIssues,
} from '@/utils/validation'

const validPayload = () => [
    { id: 1, parentId: -1, type: 'trigger', data: {} },
    {
        id: 'a',
        parentId: 1,
        type: 'sendMessage',
        name: 'Welcome',
        data: { payload: [{ type: 'text', text: 'Hi' }] },
    },
    {
        id: 'c',
        parentId: 1,
        type: 'dateTime',
        name: 'Hours',
        data: { times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }], timezone: 'UTC' },
    },
]

describe('validation', () => {
    it('validates create fields and business-hour windows', () => {
        expect(
            createNodeSchema.safeParse({
                name: '  Follow up  ',
                description: '',
                type: 'sendMessage',
            }),
        ).toMatchObject({ success: true, data: { name: 'Follow up' } })
        expect(
            createNodeSchema.safeParse({ name: '', description: '', type: 'addComment' }).success,
        ).toBe(false)
        expect(
            businessHoursSchema.safeParse({ startTime: '17:00', endTime: '09:00' }).success,
        ).toBe(false)
    })

    it('validates the full flow, skips display-only nodes, and formats issues', () => {
        expect(validateFlow(validPayload())).toEqual([])
        const payload = validPayload()
        payload[1].data.payload[0].text = 'x'.repeat(1001)
        expect(validateFlow(payload)[0].message).toContain('1000')
        expect(
            validateFlow([
                { id: 1, parentId: -1, type: 'trigger', data: {} },
                { id: 's', parentId: 1, type: 'dateTimeConnector', name: 'Success', data: {} },
            ]),
        ).toEqual([])
        expect(formatFlowIssues([{ nodeName: 'A', message: 'bad' }])).toBe('A: bad')
    })
})
