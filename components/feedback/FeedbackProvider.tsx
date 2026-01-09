'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FeedbackModule, FeedbackAction, FeedbackContextState } from '@/types/feedback';
import {
    trackActionUsage,
    shouldTriggerFeedback,
    markFeedbackShown,
    getTriggerConfig
} from '@/lib/services/feedback-frequency-service';
import FeedbackLightbox from './FeedbackLightbox';

const FeedbackContext = createContext<FeedbackContextState | null>(null);

interface FeedbackProviderProps {
    children: ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentModule, setCurrentModule] = useState<FeedbackModule | null>(null);
    const [currentAction, setCurrentAction] = useState<FeedbackAction | null>(null);

    // Mostrar el modal de feedback
    const triggerFeedback = useCallback((module: FeedbackModule, action: FeedbackAction) => {
        setCurrentModule(module);
        setCurrentAction(action);
        setIsOpen(true);
        markFeedbackShown(module);
    }, []);

    // Cerrar el modal
    const closeFeedback = useCallback(() => {
        setIsOpen(false);
        // Delay para limpiar estado después de la animación
        setTimeout(() => {
            setCurrentModule(null);
            setCurrentAction(null);
        }, 300);
    }, []);

    // Trackear acción y auto-trigger si se cumplen condiciones
    const trackAction = useCallback((module: FeedbackModule, action: FeedbackAction) => {
        // Incrementar contador de uso
        trackActionUsage(module, action);

        // Verificar si se debe mostrar feedback
        if (shouldTriggerFeedback(module, action)) {
            // Pequeño delay para no interrumpir el flujo del usuario
            setTimeout(() => {
                triggerFeedback(module, action);
            }, 1000);
        }
    }, [triggerFeedback]);

    // Obtener configuración del trigger actual
    const config = currentModule && currentAction
        ? getTriggerConfig(currentModule, currentAction)
        : null;

    return (
        <FeedbackContext.Provider
            value={{
                isOpen,
                currentModule,
                currentAction,
                triggerFeedback,
                closeFeedback,
                trackAction
            }}
        >
            {children}
            <FeedbackLightbox
                isOpen={isOpen}
                onClose={closeFeedback}
                module={currentModule}
                action={currentAction}
                title={config?.title}
                subtitle={config?.subtitle}
            />
        </FeedbackContext.Provider>
    );
}

/**
 * Hook para usar el sistema de feedback
 * @example
 * const { trackAction } = useFeedback();
 * trackAction('nomina', 'pdf_download');
 */
export function useFeedback(): FeedbackContextState {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback debe usarse dentro de un FeedbackProvider');
    }
    return context;
}
