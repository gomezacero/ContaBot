'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthStatus {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
}

export function useAuthStatus(): AuthStatus {
    const [status, setStatus] = useState<AuthStatus>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
    });

    useEffect(() => {
        const supabase = createClient();

        // Get initial session
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setStatus({
                    isAuthenticated: !!session?.user,
                    isLoading: false,
                    user: session?.user || null,
                });
            } catch {
                setStatus({
                    isAuthenticated: false,
                    isLoading: false,
                    user: null,
                });
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setStatus({
                    isAuthenticated: !!session?.user,
                    isLoading: false,
                    user: session?.user || null,
                });
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return status;
}
