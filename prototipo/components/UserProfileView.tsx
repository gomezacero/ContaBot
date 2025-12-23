
import React from 'react';
import { User } from '../types';
import { 
    User as UserIcon, 
    Mail, 
    Phone, 
    Calendar, 
    ShieldCheck, 
    CreditCard, 
    LogOut,
    Briefcase,
    Star
} from 'lucide-react';

interface Props {
    user: User;
    onLogout: () => void;
}

const UserProfileView: React.FC<Props> = ({ user, onLogout }) => {
    
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header / Banner */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-black rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white">
                        {getInitials(user.name)}
                    </div>
                    
                    {/* Basic Info */}
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-500 mt-2">
                             <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full text-xs font-medium border border-gray-100">
                                <Briefcase className="w-3.5 h-3.5" />
                                {user.occupation === 'INDEPENDENT' ? 'Contador Independiente' : user.occupation}
                             </span>
                             <span className="flex items-center gap-1.5 text-xs">
                                <Mail className="w-3.5 h-3.5" /> {user.email}
                             </span>
                        </div>
                    </div>

                    {/* Action */}
                    <div>
                        <button 
                            onClick={onLogout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl text-sm font-bold transition-all border border-gray-200 hover:border-red-100"
                        >
                            <LogOut className="w-4 h-4" /> Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Personal Details Card */}
                <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-600" /> Información Personal
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Nombre Completo</p>
                            <p className="text-gray-900 font-medium">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Correo Electrónico</p>
                            <p className="text-gray-900 font-medium">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">WhatsApp / Contacto</p>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-500" />
                                <p className="text-gray-900 font-medium">{user.phone || 'No registrado'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Fecha de Registro</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                <p className="text-gray-900 font-medium">{formatDate(user.registrationDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Membership Card */}
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-xl p-6 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-6 opacity-20">
                        <ShieldCheck className="w-32 h-32 text-white" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 border border-white/10">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Plan Actual
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight mb-1">{user.membershipType}</h3>
                        <p className="text-gray-400 text-sm">Versión Gratuita (Beta)</p>
                    </div>

                    <div className="relative z-10 mt-8 pt-6 border-t border-gray-800">
                        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                            Disfruta de todas las funciones PRO por tiempo limitado mientras estamos en fase Beta.
                        </p>
                        <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" disabled>
                            <CreditCard className="w-4 h-4" />
                            Gestionar Suscripción
                        </button>
                        <p className="text-[10px] text-center text-gray-500 mt-2">Próximamente disponible</p>
                    </div>
                </div>
            </div>

            {/* Account Settings Placeholder */}
             <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/60 border-dashed text-center">
                <p className="text-gray-400 text-sm font-medium">Más configuraciones de seguridad y preferencias estarán disponibles pronto.</p>
             </div>
        </div>
    );
};

export default UserProfileView;
