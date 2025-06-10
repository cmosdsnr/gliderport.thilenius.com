import { useAuth } from '@/contexts/AuthContext'
import { useMutation, UseMutationResult } from 'react-query';

/**
 * Custom hook to handle user sign-up using AuthContext and react-query's useMutation.
 * @returns The mutation object for signing up.
 */
export function useSignUp(): UseMutationResult<any, unknown, { data: any }, unknown> {
    /**
     * Performs the sign-up operation.
     * @param param.data - The data object containing user sign-up information.
     * @returns A promise that resolves when the sign-up is successful.
     */
    async function signUp({ data }: any) {
        const { signUp } = useAuth();
        signUp(data);
    }

    return useMutation(signUp)
}

export default useSignUp;
