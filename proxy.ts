import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
    // proxy.ts en Next.js 16 es SOLO para routing (rewrites, redirects, headers)
    // La autenticación debe hacerse en layouts o route handlers (CVE-2025-29927)

    const response = NextResponse.next()

    // Redirigir usuarios en páginas de auth si ya están autenticados
    // Esto se detecta por la presencia de la cookie de sesión de Supabase
    const authPaths = ['/login', '/register']
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname === path)

    // Verificar si existe cookie de sesión de Supabase (indicador básico)
    const hasSession = request.cookies.getAll().some(cookie =>
        cookie.name.includes('supabase') && cookie.name.includes('auth')
    )

    if (isAuthPath && hasSession) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         * - api routes (handled separately)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
