
import { useAuth } from 'contexts/AuthContextPocketbase'
import { useMutation } from 'react-query'

export default function useLogin() {
    async function login({ email, password }: any) {
        const { login } = useAuth();
        await login(email, password);
    }
    return useMutation(login)
}

