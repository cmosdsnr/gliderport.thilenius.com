import { useAuth } from '@/contexts/AuthContext'
import { useMutation, UseMutationResult } from 'react-query'

/**
 * Custom hook to handle user login using AuthContext and react-query's useMutation.
 * @returns The mutation object for logging in.
 */
export function useLogin(): UseMutationResult<any, unknown, { email: string; password: string }, unknown> {
    /**
     * Performs the login operation.
     * @param param.email - The user's email address.
     * @param param.password - The user's password.
     */
    async function login({ email, password }: { email: string; password: string }) {
        const { login } = useAuth();
        await login(email, password);
    }
    return useMutation(login)
}

export default useLogin;

