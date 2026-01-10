import Link from 'next/link';

interface FooterProps {
    variant?: 'full' | 'compact' | 'minimal';
}

export default function Footer({ variant = 'full' }: FooterProps) {
    const currentYear = new Date().getFullYear();

    // Minimal variant - just links and copyright
    if (variant === 'minimal') {
        return (
            <footer className="border-t border-zinc-100 py-4 px-6 bg-white">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
                    <p className="font-bold uppercase tracking-widest">© {currentYear} Contabio by QuickTipss</p>
                    <div className="flex items-center gap-4">
                        <Link href="/terminos" className="hover:text-emerald-600 transition-colors">
                            Términos
                        </Link>
                        <Link href="/privacidad" className="hover:text-emerald-600 transition-colors">
                            Privacidad
                        </Link>
                        <Link href="/seguridad" className="hover:text-emerald-600 transition-colors">
                            Seguridad
                        </Link>
                    </div>
                </div>
            </footer>
        );
    }

    // Compact variant - for login/register pages
    if (variant === 'compact') {
        return (
            <footer className="py-6 px-4">
                <div className="max-w-md mx-auto">
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
                        <Link
                            href="/terminos"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Términos y Condiciones
                        </Link>
                        <span className="text-zinc-200">|</span>
                        <Link
                            href="/privacidad"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Privacidad
                        </Link>
                        <span className="text-zinc-200">|</span>
                        <Link
                            href="/seguridad"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Seguridad
                        </Link>
                    </div>
                    <p className="text-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.25em]">
                        © {currentYear} Contabio by Valueum
                    </p>
                </div>
            </footer>
        );
    }

    // Full variant - for landing page
    return (
        <footer className="bg-white border-t border-zinc-100 py-8">
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    {/* Logo & Description */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
                                <span className="text-white font-black text-sm">C</span>
                            </div>
                            <span className="text-xl font-extrabold tracking-tight text-zinc-900">Contabio</span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium max-w-[280px] leading-relaxed">
                            Redefiniendo el flujo de trabajo contable en Colombia con IA de última generación.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
                        <Link
                            href="/privacidad"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Políticas de Privacidad
                        </Link>
                        <Link
                            href="/terminos"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Términos y Condiciones
                        </Link>
                        <Link
                            href="/seguridad"
                            className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]"
                        >
                            Seguridad
                        </Link>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-6 border-t border-zinc-50 flex flex-col items-center text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">
                    <p>© {currentYear} by Valueum</p>
                </div>
            </div>
        </footer>
    );
}
