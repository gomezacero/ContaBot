
import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, Phone, Briefcase, Sparkles, UserPlus, LogIn, KeyRound, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

export type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState<string>('INDEPENDENT');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API calls
    setTimeout(() => {
        if (mode === 'LOGIN') {
             if (email && password) {
                // Mock Login Success
                onLogin({
                    name: "Usuario Demo",
                    email: email,
                    phone: "+57 300 123 4567",
                    occupation: 'INDEPENDENT',
                    role: 'ACCOUNTANT',
                    registrationDate: '2024-01-15',
                    membershipType: 'FREEMIUM'
                });
             }
        } else if (mode === 'REGISTER') {
            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden");
                setLoading(false);
                return;
            }
            // Mock Register Success
             onLogin({
                name: name,
                email: email,
                phone: phone,
                occupation: occupation as any,
                role: 'ACCOUNTANT',
                registrationDate: new Date().toISOString().split('T')[0],
                membershipType: 'FREEMIUM'
            });
        } else if (mode === 'FORGOT_PASSWORD') {
            setSuccessMsg(`Hemos enviado un enlace de recuperación a ${email}`);
            setLoading(false);
            return; // Don't login, just show success
        }
        
        if (mode !== 'FORGOT_PASSWORD') {
            setLoading(false);
        }
    }, 1500);
  };

  const getTitle = () => {
      switch(mode) {
          case 'LOGIN': return 'Bienvenido de nuevo';
          case 'REGISTER': return 'Crea tu cuenta gratis';
          case 'FORGOT_PASSWORD': return 'Recuperar Contraseña';
      }
  };

  const getSubtitle = () => {
      switch(mode) {
          case 'LOGIN': return 'Accede a tu historial y configuraciones.';
          case 'REGISTER': return 'Únete a miles de contadores eficientes.';
          case 'FORGOT_PASSWORD': return 'Te enviaremos las instrucciones al correo.';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 flex flex-col">
        
        {/* Header Image/Gradient */}
        <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-black relative p-6 flex flex-col justify-end overflow-hidden min-h-[140px]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-32 h-32 text-white" />
            </div>
            
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
            >
                <X className="w-5 h-5" />
            </button>
            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-1">{getTitle()}</h2>
                <p className="text-indigo-200 text-sm font-medium">{getSubtitle()}</p>
            </div>
        </div>

        <div className="p-6 md:p-8 space-y-5">
            
            {successMsg ? (
                <div className="text-center py-8 animate-in fade-in">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¡Correo Enviado!</h3>
                    <p className="text-gray-500 mb-6">{successMsg}</p>
                    <button 
                        onClick={() => { setSuccessMsg(''); setMode('LOGIN'); }}
                        className="text-blue-600 font-bold hover:underline"
                    >
                        Volver al inicio de sesión
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                        
                        {/* Name & Phone (Register Only) */}
                        {mode === 'REGISTER' && (
                            <>
                                <div className="relative animate-in slide-in-from-left-2 duration-300">
                                    <input
                                        type="text"
                                        placeholder="Nombre Completo"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-4 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                                    />
                                </div>
                                <div className="relative animate-in slide-in-from-left-2 duration-300 delay-75">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="Celular / WhatsApp"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                                    />
                                </div>
                                <div className="relative animate-in slide-in-from-left-2 duration-300 delay-100">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Briefcase className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={occupation}
                                        onChange={(e) => setOccupation(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors appearance-none"
                                    >
                                        <option value="INDEPENDENT">Contador Independiente</option>
                                        <option value="OUTSOURCING">Outsourcing Contable</option>
                                        <option value="INHOUSE">Contador In-house</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Email (All modes) */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                placeholder="Correo electrónico"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                            />
                        </div>

                        {/* Password (Login & Register) */}
                        {mode !== 'FORGOT_PASSWORD' && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    placeholder={mode === 'REGISTER' ? "Crea una contraseña" : "Tu contraseña"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                                />
                            </div>
                        )}
                        
                        {/* Confirm Password (Register Only) */}
                        {mode === 'REGISTER' && (
                            <div className="relative animate-in slide-in-from-left-2 duration-300">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Confirma la contraseña"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Forgot Password Link */}
                    {mode === 'LOGIN' && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setMode('FORGOT_PASSWORD')}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 mt-6"
                    >
                        {loading ? 'Procesando...' : (
                            mode === 'LOGIN' ? 'Iniciar Sesión' : 
                            mode === 'REGISTER' ? 'Crear Cuenta' : 'Enviar Enlace'
                        )}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>
            )}
        </div>
        
        {/* Footer / Toggle Mode */}
        {!successMsg && (
            <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100 flex justify-center gap-2 text-sm">
                {mode === 'LOGIN' ? (
                    <>
                        <span className="text-gray-500">¿No tienes cuenta?</span>
                        <button onClick={() => setMode('REGISTER')} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                            Regístrate <UserPlus className="w-3 h-3"/>
                        </button>
                    </>
                ) : (
                    <>
                        <span className="text-gray-500">¿Ya tienes cuenta?</span>
                        <button onClick={() => setMode('LOGIN')} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                            Inicia Sesión <LogIn className="w-3 h-3"/>
                        </button>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
