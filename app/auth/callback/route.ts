import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Callback de autenticación para manejar:
 * - Verificación de email
 * - Recuperación de contraseña
 * - Autenticación OAuth (si se implementa en el futuro)
 */
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') || '/dashboard';

    // Si hay un código de autenticación, intercambiarlo por una sesión
    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth callback error:', error);
            // Redirigir a login con mensaje de error
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent('Error de autenticación. Intenta de nuevo.')}`, requestUrl.origin)
            );
        }

        // Si es recuperación de contraseña, redirigir a página de reset
        if (type === 'recovery') {
            return NextResponse.redirect(
                new URL('/auth/reset-password', requestUrl.origin)
            );
        }

        // Si es verificación de email, redirigir al dashboard con mensaje
        if (type === 'signup' || type === 'email') {
            return NextResponse.redirect(
                new URL('/dashboard?verified=true', requestUrl.origin)
            );
        }

        // Redirigir a la página solicitada o al dashboard
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Si no hay código, probablemente es un error o acceso directo
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
