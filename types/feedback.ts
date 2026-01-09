// Tipos para el sistema de Feedback LightBox

// Módulos que soportan feedback
export type FeedbackModule = 'nomina' | 'gastos' | 'calendario';

// Acciones que disparan tracking de feedback
export type FeedbackAction =
    | 'pdf_download'      // Descarga de PDF (nómina, liquidación)
    | 'excel_export'      // Exportación Excel (asiento contable)
    | 'ocr_process'       // Procesamiento OCR de documentos
    | 'save_employee'     // Guardar empleado
    | 'save_client';      // Guardar cliente/calendario

// Configuración para cada trigger de feedback
export interface FeedbackTriggerConfig {
    module: FeedbackModule;
    action: FeedbackAction;
    frequency: number;      // Mostrar cada N usos
    title: string;          // Título del modal
    subtitle: string;       // Pregunta contextual
}

// Payload para enviar feedback a Supabase
export interface FeedbackPayload {
    user_id: string | null;
    module_name: FeedbackModule;
    action_type?: FeedbackAction;
    rating: number;         // 1-5 estrellas
    comment?: string | null;
    is_guest: boolean;
}

// Estado del context provider
export interface FeedbackContextState {
    isOpen: boolean;
    currentModule: FeedbackModule | null;
    currentAction: FeedbackAction | null;
    triggerFeedback: (module: FeedbackModule, action: FeedbackAction) => void;
    closeFeedback: () => void;
    trackAction: (module: FeedbackModule, action: FeedbackAction) => void;
}

// Tracking de uso en localStorage
export interface UsageTracker {
    [key: string]: number;  // Formato: "module_action" -> contador
}

// Cooldown de feedback por módulo
export interface FeedbackCooldown {
    [module: string]: number;  // Unix timestamp del último feedback
}

// Labels de rating en español
export const RATING_LABELS: Record<number, string> = {
    0: 'Selecciona una calificación',
    1: 'Muy malo',
    2: 'Malo',
    3: 'Regular',
    4: 'Bueno',
    5: '¡Excelente!'
};
