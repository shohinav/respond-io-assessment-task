import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchPayload, updatePayload } from '@/api/flowApi'

const STORAGE_KEY = 'respond-flow-payload'
const SAMPLE = [{ id: 1, parentId: -1, type: 'trigger', data: {} }]
const okResponse = (body) => ({ ok: true, json: async () => body })

describe('flowApi persistence', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => vi.restoreAllMocks())

    it('fetches and caches payload.json on first load', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse(SAMPLE))
        await expect(fetchPayload()).resolves.toEqual(SAMPLE)
        expect(fetchSpy).toHaveBeenCalledWith('/payload.json')
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(SAMPLE)
    })

    it('writes payloads and reports storage quota errors', async () => {
        await expect(updatePayload(SAMPLE)).resolves.toEqual(SAMPLE)
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(SAMPLE)

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError')
        })
        await expect(updatePayload(SAMPLE)).rejects.toThrow(/storage is full/i)
    })
})
