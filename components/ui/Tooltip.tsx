'use client';

import { useState, useRef, cloneElement, isValidElement, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info } from 'lucide-react';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    icon?: 'help' | 'info';
    /** Si true, inyecta handlers en el hijo sin wrapper (para botones) */
    asWrapper?: boolean;
}

export function Tooltip({ content, children, icon = 'help', asWrapper = false }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement | HTMLButtonElement>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        setTooltipPosition({
            top: rect.top - 8,
            left: rect.left + rect.width / 2
        });
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    // Modo asWrapper: clona el hijo e inyecta handlers sin wrapper
    if (asWrapper && children && isValidElement(children)) {
        const child = children as ReactElement<{ onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: () => void }>;

        const clonedChild = cloneElement(child, {
            onMouseEnter: (e: React.MouseEvent) => {
                handleMouseEnter(e);
                // Llamar al handler original si existe
                if (child.props.onMouseEnter) {
                    child.props.onMouseEnter(e);
                }
            },
            onMouseLeave: () => {
                handleMouseLeave();
                // Llamar al handler original si existe
                if (child.props.onMouseLeave) {
                    child.props.onMouseLeave();
                }
            },
        });

        return (
            <>
                {clonedChild}
                {isVisible && typeof document !== 'undefined' && createPortal(
                    <div
                        className="fixed z-[9999] pointer-events-none"
                        style={{
                            top: tooltipPosition.top,
                            left: tooltipPosition.left,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-xs animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-center leading-relaxed">{content}</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>,
                    document.body
                )}
            </>
        );
    }

    // Modo icon (original): muestra icono de ayuda
    return (
        <div
            ref={triggerRef as React.RefObject<HTMLDivElement>}
            className="relative inline-flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children || (
                <div className="text-gray-400 hover:text-purple-600 cursor-help transition-colors">
                    {icon === 'help' ? <HelpCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                </div>
            )}

            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-center leading-relaxed">{content}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
}
