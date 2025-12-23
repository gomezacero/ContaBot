'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, UserPlus } from 'lucide-react';
import { isGuestBannerDismissed, dismissGuestBanner } from '@/lib/local-storage';
import Link from 'next/link';

interface GuestBannerProps {
    className?: string;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({ className = '' }) => {
    const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check dismissal status on mount
        const dismissed = isGuestBannerDismissed();
        setIsDismissed(dismissed);

        // Small delay for animation
        if (!dismissed) {
            setTimeout(() => setIsVisible(true), 100);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => {
            dismissGuestBanner();
            setIsDismissed(true);
        }, 300);
    };

    if (isDismissed) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                } ${className}`}
        >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm">
                                Modo Invitado
                            </p>
                            <p className="text-xs text-white/80">
                                Tus datos solo se guardan en este navegador. Inicia sesión para acceder desde cualquier dispositivo.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                            href="/auth/register"
                            className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Crear cuenta gratis</span>
                            <span className="sm:hidden">Registrarse</span>
                        </Link>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Cerrar banner"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
