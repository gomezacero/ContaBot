
import React, { useState, useEffect, useRef } from 'react';
import EmployeeManager from './components/EmployeeManager';
import ResultsView from './components/ResultsView';
import SmartExpenseView from './components/SmartExpenseView';
import TaxCalendarView from './components/TaxCalendarView'; 
import UserProfileView from './components/UserProfileView';
import LoginModal from './components/LoginModal'; 
import { PayrollInput, RiskLevel, User, CalendarClientConfig, ExpenseHistoryItem, UserData } from './types';
import { calculateGroupPayroll } from './utils/calculations';
import { SMMLV_2025 } from './constants';
import { 
  Bot, 
  LayoutDashboard, 
  ScanLine, 
  User as UserIcon, 
  ChevronRight,
  TrendingUp,
  Zap,
  CalendarDays,
  ArrowRight,
  Calculator,
  Bell,
  Star,
  Heart,
  TrendingDown,
  Flame,
  ArrowUpRight
} from 'lucide-react';

const App: React.FC = () => {
  // Navigation State - Removed 'exogena' and 'simulator'
  const [currentTab, setCurrentTab] = useState<'payroll' | 'smart_expense' | 'calendar' | 'profile'>('payroll');
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const stored = localStorage.getItem('contaBot_user');
      return stored ? JSON.parse(stored) : null;
  });

  const [employees, setEmployees] = useState<PayrollInput[]>([{
    id: 'default-1',
    employerType: 'JURIDICA',
    name: 'Empleado 1',
    baseSalary: SMMLV_2025,
    riskLevel: RiskLevel.I,
    isExempt: true,
    includeTransportAid: true,
    enableDeductions: false,
    deductionsParameters: {
        housingInterest: 0,
        prepaidMedicine: 0,
        voluntaryPension: 0,
        voluntaryPensionExempt: 0,
        afc: 0,
        hasDependents: false
    }
  }]);

  const results = calculateGroupPayroll(employees);
  const isUserLoggedIn = !!currentUser;

  const handleStartApp = () => {
    setHasStarted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabSwitch = (tab: any) => {
    setHasStarted(true);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const painMetrics = [
    { val: "92%", label: "Burnout Contable", desc: "Sufren estrés diario por carga operativa.", source: "Sage Practice of Now" },
    { val: "50%+", label: "Tiempo Perdido", desc: "Dedicado a digitación manual de soportes.", source: "IFAC Technology Report" },
    { val: "68%", label: "Riesgo de Error", desc: "Errores críticos en transcripción humana.", source: "Deloitte Tax Survey" },
    { val: "10h+", label: "Horas Extra", desc: "Semanalmente solo gestionando vencimientos.", source: "Estudio Nacional Contable" },
    { val: "300%", label: "Costo Sanción", desc: "Más caro corregir que automatizar el flujo.", source: "DIAN / E.T. Art 651" },
  ];

  return (
    <div className={`min-h-screen font-sans bg-[#F9FAFB] ${!hasStarted ? 'overflow-x-hidden' : ''}`}>
      
      {/* Navigation Shell - Finpay Style */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setHasStarted(false)}>
              <div className="w-10 h-10 bg-[#002D44] text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[#002D44]">ContaBot</span>
            </div>

            {hasStarted && (
              <nav className="hidden lg:flex items-center gap-8">
                {[
                  { id: 'payroll', label: 'Nómina', icon: LayoutDashboard },
                  { id: 'smart_expense', label: 'Digitador', icon: ScanLine },
                  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id as any)}
                    className={`text-sm font-semibold transition-all ${
                      currentTab === item.id ? 'text-[#1AB1B1]' : 'text-gray-400 hover:text-[#002D44]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!currentUser ? (
              <div className="flex items-center gap-4">
                <button onClick={() => { setInitialAuthMode('LOGIN'); setIsLoginOpen(true); }} className="text-sm font-bold text-gray-700 hover:text-[#1AB1B1] transition-colors">Login</button>
                <button onClick={() => { setInitialAuthMode('REGISTER'); setIsLoginOpen(true); }} className="bg-[#1AB1B1] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-teal-500/20 hover:scale-105 transition-all">Empieza Gratis</button>
              </div>
            ) : (
              <button onClick={() => handleTabSwitch('profile')} className="w-10 h-10 bg-[#1AB1B1] text-white rounded-full flex items-center justify-center font-bold shadow-md">{currentUser.name[0]}</button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-7xl">
        {!hasStarted && !currentUser ? (
          <div className="animate-in fade-in duration-1000">
            {/* HERO SECTION */}
            <section className="py-24 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-[#1AB1B1] text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-teal-100">
                <Star className="w-3 h-3 fill-current" /> Inteligencia Fiscal 2025
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-[#002D44] tracking-tighter leading-[0.9] mb-8">
                Get paid early <br/>
                <span className="text-[#1AB1B1]">automate your work.</span>
              </h1>
              <p className="text-xl text-gray-500 font-medium mb-12 max-w-2xl mx-auto">
                ContaBot es el Financial OS para contadores colombianos. Automatiza facturas, nomina y vigila el <span className="text-[#002D44] font-bold">calendario tributario</span> sin intervención manual.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button onClick={handleStartApp} className="bg-[#002D44] text-white px-10 py-5 rounded-full font-black text-lg hover:bg-black transition-all shadow-xl flex items-center gap-3">
                  Empezar ahora <ArrowRight className="w-5 h-5" />
                </button>
                <button className="bg-white text-[#002D44] px-10 py-5 rounded-full font-bold text-lg border border-gray-100 hover:bg-gray-50 transition-all shadow-sm">Ver Video Demo</button>
              </div>
            </section>

            {/* PAIN METRICS SECTION */}
            <section className="py-20 border-t border-gray-100">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-[#002D44] tracking-tight mb-4">La Realidad del Contador en 2025</h2>
                <p className="text-gray-400 font-semibold uppercase text-xs tracking-widest">¿Por qué la automatización ya no es opcional?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {painMetrics.map((stat, i) => (
                  <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm hover:shadow-xl transition-all group">
                    <p className="text-4xl font-black text-[#002D44] mb-2 group-hover:text-[#1AB1B1] transition-colors">{stat.val}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-[#1AB1B1] mb-4">{stat.label}</p>
                    <p className="text-[11px] text-gray-400 font-bold leading-relaxed mb-6">{stat.desc}</p>
                    <div className="pt-4 border-t border-gray-50 flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                      <Flame className="w-3 h-3 text-orange-400" /> Fuente: {stat.source}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FEATURE CARDS SECTION */}
            <section className="py-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div onClick={() => handleTabSwitch('payroll')} className="bg-[#1AB1B1] text-white rounded-[3.5rem] p-16 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all shadow-2xl shadow-teal-500/10">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Calculator className="w-32 h-32" /></div>
                  <h3 className="text-4xl font-black tracking-tighter mb-4">Nómina Impecable</h3>
                  <p className="text-teal-100 font-medium mb-12 max-w-sm">Cálculos automáticos bajo ley 2025, provisiones y liquidaciones en un clic.</p>
                  <div className="bg-white/10 w-fit px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">Abrir Módulo <ArrowUpRight className="w-4 h-4"/></div>
                </div>

                <div onClick={() => handleTabSwitch('calendar')} className="bg-[#002D44] text-white rounded-[3.5rem] p-16 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all shadow-2xl">
                   <div className="absolute top-0 right-0 p-10 opacity-10"><CalendarDays className="w-32 h-32" /></div>
                   <h3 className="text-4xl font-black tracking-tighter mb-4">Calendario Tributario</h3>
                   <p className="text-gray-400 font-medium mb-12 max-w-sm">Vigilancia de NITs y alertas preventivas de vencimientos DIAN directo al correo.</p>
                   <div className="bg-white/10 w-fit px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">Gestionar NITs <ArrowUpRight className="w-4 h-4"/></div>
                </div>
              </div>
            </section>

            {/* DARK CALL TO ACTION */}
            <section className="bg-[#002D44] rounded-[4rem] p-24 text-center text-white relative overflow-hidden mb-32 shadow-2xl">
              <div className="absolute bottom-0 left-0 w-full h-1 brand-gradient"></div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-tight">Ready to level up your <br/> process with IA?</h2>
              <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">Únete a cientos de contadores que ya están automatizando su oficina con ContaBot.</p>
              <div className="flex justify-center">
                <button onClick={handleStartApp} className="bg-[#1AB1B1] text-white px-12 py-5 rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl shadow-teal-500/20">Get Started Now</button>
              </div>
            </section>
          </div>
        ) : (
          <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {currentTab === 'payroll' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                  <EmployeeManager employees={employees} setEmployees={setEmployees} activeEmployeeId={employees[0].id} setActiveEmployeeId={() => {}} />
                </div>
                <div className="lg:col-span-8">
                  <ResultsView result={results} employees={employees} activeEmployeeId={employees[0].id} isUserLoggedIn={isUserLoggedIn} />
                </div>
              </div>
            )}
            {currentTab === 'smart_expense' && <SmartExpenseView isUserLoggedIn={isUserLoggedIn} />}
            {currentTab === 'calendar' && <TaxCalendarView isUserLoggedIn={isUserLoggedIn} />}
            {currentTab === 'profile' && currentUser && <UserProfileView user={currentUser} onLogout={() => { setCurrentUser(null); localStorage.removeItem('contaBot_user'); setHasStarted(false); }} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#002D44] text-white rounded-lg flex items-center justify-center"><Bot className="w-5 h-5" /></div>
            <span className="text-xl font-black tracking-tighter">ContaBot</span>
          </div>
          <div className="flex gap-12">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Soluciones</p>
              <ul className="text-sm font-bold text-[#002D44] space-y-2">
                <li className="cursor-pointer hover:text-[#1AB1B1]" onClick={() => handleTabSwitch('payroll')}>Nómina</li>
                <li className="cursor-pointer hover:text-[#1AB1B1]" onClick={() => handleTabSwitch('calendar')}>Calendario Tributario</li>
                <li className="cursor-pointer hover:text-[#1AB1B1]" onClick={() => handleTabSwitch('smart_expense')}>Digitador OCR</li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compañía</p>
              <ul className="text-sm font-bold text-[#002D44] space-y-2">
                <li className="cursor-pointer hover:text-[#1AB1B1]">Nosotros</li>
                <li className="cursor-pointer hover:text-[#1AB1B1]">Soporte</li>
              </ul>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 font-medium">© 2025 ContaBot. Reservados todos los derechos.</p>
          </div>
        </div>
      </footer>

      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onLogin={(u) => { setCurrentUser(u); setIsLoginOpen(false); setHasStarted(true); }} initialMode={initialAuthMode} />}
    </div>
  );
};

export default App;
