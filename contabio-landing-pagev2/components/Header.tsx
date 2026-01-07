
import React from 'react';

interface HeaderProps {
  scrolled: boolean;
}

const Header: React.FC<HeaderProps> = ({ scrolled }) => {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex items-center justify-center ${
        scrolled 
          ? 'glass-header py-3 shadow-sm border-b border-zinc-100/50' 
          : 'bg-transparent py-6'
      }`}
    >
      <div 
        className="flex items-center space-x-3 cursor-pointer group" 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Contabio Home"
      >
        <div className="w-10 h-10 lg:w-11 lg:h-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-all group-hover:scale-105 group-hover:rotate-3">
          <span className="text-white font-black text-xl lg:text-2xl">C</span>
        </div>
        <span className="text-xl lg:text-2xl font-extrabold tracking-tight text-zinc-900 group-hover:text-emerald-700 transition-colors">
          Contabio
        </span>
      </div>
    </header>
  );
};

export default Header;
