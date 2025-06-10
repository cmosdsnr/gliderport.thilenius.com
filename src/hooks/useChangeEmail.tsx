import { useAuth } from '@/contexts/AuthContext'
import { useMutation, UseMutationResult } from 'react-query'

/**
 * Custom hook to handle changing the user's email address.
 * Uses the AuthContext and react-query's useMutation.
 * @returns The mutation object for changing email.
 */
export function useChangeEmail(): UseMutationResult<any, unknown, string, unknown> {
    /**
     * Sends a request to change the user's email address.
     * @param newEmail - The new email address to set.
     */
    async function changeEmail(newEmail: string) {
        const { changeEmail } = useAuth() as any;
        const res = changeEmail(newEmail)
        if (!res) alert('Email change request sent to ' + newEmail + '! Check your inbox.')
        else alert('Error changing Email: ' + res)
        //https://pocketbase.io/docs/api-records/#requestemailchange
    }
    return useMutation(changeEmail)
}

export default useChangeEmail;



