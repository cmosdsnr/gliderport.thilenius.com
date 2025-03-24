import React from 'react'
import { useAuth } from 'contexts/AuthContextPocketbase'

export const useVerified = () => {
    const { pb, currentUser } = useAuth();
    // if (pb.authStore.isValid && pb.authStore.record)
    //     return pb.authStore.model.verified;
    if (currentUser) return currentUser.verified;
    else return false;
}
