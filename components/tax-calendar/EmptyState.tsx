import React from 'react';
import { Cloud, Plus } from 'lucide-react';

export const TaxCalendarEmptyState = () => {
    return (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Cloud className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-[#002D44] mb-2">No hay calendarios</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
                Registra un cliente con su NIT para autogenerar su calendario de obligaciones.
            </p>
        </div>
    );
};
