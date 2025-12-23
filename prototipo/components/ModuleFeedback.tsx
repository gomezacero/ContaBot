
import React, { useState } from 'react';
import { Star, Send, ThumbsUp } from 'lucide-react';

interface Props {
    moduleName: string;
}

const ModuleFeedback: React.FC<Props> = ({ moduleName }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleSubmit = () => {
        if (rating === 0) return;
        
        // Simulación de envío de datos
        console.log(`[Feedback Enviado] Módulo: ${moduleName} | Calificación: ${rating}/5 | Comentario: ${comment}`);
        
        // Efecto de salida inmediato
        setSubmitted(true);
    };

    if (submitted) return null;

    return (
        <div className="mt-16 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <div className="flex justify-center mb-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                        <ThumbsUp className="w-5 h-5" />
                    </div>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">¿Qué tal te pareció el módulo de {moduleName}?</h4>
                <p className="text-xs text-gray-500 mb-4">Tu calificación nos ayuda a mejorar la precisión de ContaBot.</p>
                
                <div className="flex justify-center gap-3 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                        >
                            <Star 
                                className={`w-8 h-8 transition-colors ${
                                    star <= (hoveredStar || rating) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-200'
                                }`} 
                            />
                        </button>
                    ))}
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${rating > 0 ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="relative">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Déjanos un comentario (Opcional)..."
                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-gray-50 resize-none h-20"
                        />
                        <button 
                            onClick={handleSubmit}
                            className="absolute right-2 bottom-2 p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-md"
                            title="Enviar Calificación"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                        La sección desaparecerá al enviar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ModuleFeedback;
