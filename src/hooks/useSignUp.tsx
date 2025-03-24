import { useAuth } from 'contexts/AuthContextPocketbase'
import { useMutation } from 'react-query';

export default function useSignUp() {
    async function signUp({ data }: any) {
        const { signUp } = useAuth();
        signUp(data);
    }

    return useMutation(signUp)
}
