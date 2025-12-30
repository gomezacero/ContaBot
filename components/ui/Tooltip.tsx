'use client';

import { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    icon?: 'help' | 'info';
}

export function Tooltip({ content, children, icon = 'help' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
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
