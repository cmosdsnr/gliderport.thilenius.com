import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Returns whether the currently authenticated user has a verified email address.
 *
 * @remarks
 * "Verified" means the user clicked the confirmation link that PocketBase sent
 * to their email after registration. Unverified users are authenticated but
 * may be restricted from certain features (e.g. SMS alert opt-in, admin pages).
 *
 * Reads `currentUser.verified` from {@link AuthContext}. Returns `false` when
 * no user is logged in.
 *
 * @returns `true` if a user is logged in and their email has been verified in
 * PocketBase; `false` otherwise.
 *
 * @example
 * ```tsx
 * const verified = useVerified();
 * if (!verified) return <p>Please verify your email to continue.</p>;
 * ```
 */
export const useVerified = () => {
    const { pb, currentUser } = useAuth();
    // if (pb.authStore.isValid && pb.authStore.record)
    //     return pb.authStore.model.verified;
    if (currentUser) return currentUser.verified;
    else return false;
}
