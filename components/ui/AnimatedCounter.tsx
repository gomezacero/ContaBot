'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    formatter?: (value: number) => string;
    className?: string;
}

export function AnimatedCounter({
    value,
    duration = 500,
    prefix = '',
    formatter = (v) => v.toLocaleString('es-CO'),
    className = ''
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(value);
    const endValueRef = useRef(value);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        startValueRef.current = displayValue;
        endValueRef.current = value;
        startTimeRef.current = null;

        const animate = (time: number) => {
            if (!startTimeRef.current) startTimeRef.current = time;
            const progress = Math.min((time - startTimeRef.current) / duration, 1);

            // Easing function (easeOutQuart)
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = startValueRef.current + (endValueRef.current - startValueRef.current) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [value, duration]);

    return (
        <span className={className}>
            {prefix}{formatter(Math.round(displayValue))}
        </span>
    );
}
