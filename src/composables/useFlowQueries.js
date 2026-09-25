import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { fetchPayload, updatePayload } from '@/api/flowApi'
import { useFlowStore } from '@/stores/flow'

export const FLOW_QUERY_KEY = ['flow-payload']

export function useFlowPayload() {
    return useQuery({
        queryKey: FLOW_QUERY_KEY,
        queryFn: fetchPayload,
    })
}

export function useUpdateFlowMutation() {
    const queryClient = useQueryClient()
    const store = useFlowStore()

    return useMutation({
        mutationFn: updatePayload,
        onSuccess: (payload) => {
            queryClient.setQueryData(FLOW_QUERY_KEY, payload)
            store.markSaved()
        },
    })
}
