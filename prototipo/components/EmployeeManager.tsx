
import React from 'react';
import { PayrollInput, RiskLevel } from '../types';
import InputForm from './InputForm';
import { Plus, Trash2, UserCircle2, Info } from 'lucide-react';
import { SMMLV_2025 } from '../constants';

interface EmployeeManagerProps {
  employees: PayrollInput[];
  setEmployees: React.Dispatch<React.SetStateAction<PayrollInput[]>>;
  activeEmployeeId: string;
  setActiveEmployeeId: (id: string) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ 
  employees, 
  setEmployees, 
  activeEmployeeId, 
  setActiveEmployeeId 
}) => {

  const createNewEmployee = (): PayrollInput => ({
    id: crypto.randomUUID(),
    employerType: 'JURIDICA',
    companyName: '',
    companyNit: '',
    name: `Empleado ${employees.length + 1}`,
    documentNumber: '',
    jobTitle: '',
    contractType: 'INDEFINIDO',
    baseSalary: SMMLV_2025,
    riskLevel: RiskLevel.I,
    isExempt: true,
    includeTransportAid: true,
    startDate: '2025-01-01',
    endDate: '2025-01-30',
    enableDeductions: false,
    deductionsParameters: {
        housingInterest: 0,
        prepaidMedicine: 0,
        voluntaryPension: 0,
        voluntaryPensionExempt: 0,
        afc: 0,
        hasDependents: false
    },
    hedHours: 0,
    henHours: 0,
    rnHours: 0,
    domFestHours: 0,
    heddfHours: 0,
    hendfHours: 0,
    commissions: 0,
    salaryBonuses: 0,
    nonSalaryBonuses: 0,
    loans: 0,
    otherDeductions: 0
  });

  const handleAddEmployee = () => {
    if (employees.length >= 10) return;
    const newEmp = createNewEmployee();
    setEmployees([...employees, newEmp]);
    setActiveEmployeeId(newEmp.id);
  };

  const handleUpdateEmployee = (updatedEmployee: PayrollInput) => {
    setEmployees(employees.map(emp => 
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
  };

  const handleDeleteEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (employees.length === 1) return; 
    
    const newEmployees = employees.filter(emp => emp.id !== id);
    setEmployees(newEmployees);
    
    if (activeEmployeeId === id) {
      setActiveEmployeeId(newEmployees[0].id);
    }
  };

  const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

  return (
    <div className="space-y-4">
      
      {/* Explanatory Text */}
      <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl flex gap-3 items-start">
        <div className="bg-white p-1.5 rounded-lg shadow-sm text-indigo-600 mt-0.5">
            <Info className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-indigo-900/80 leading-relaxed font-medium">
            Gestiona la nómina individualmente. Cada pestaña representa un cálculo independiente.
        </p>
      </div>
        
      {/* Horizontal Tabs Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
          {employees.map((emp) => {
            const isActive = emp.id === activeEmployeeId;
            return (
              <div 
                key={emp.id}
                onClick={() => setActiveEmployeeId(emp.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 cursor-pointer transition-all duration-200 group relative ${
                  isActive 
                  ? 'bg-white border-blue-600 text-blue-900 shadow-sm' 
                  : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                style={{ minWidth: '140px' }}
              >
                  <UserCircle2 className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex flex-col">
                     <span className="text-xs font-bold truncate max-w-[90px]">{emp.name}</span>
                     <span className="text-[10px] font-mono opacity-70 truncate max-w-[80px]">
                         {emp.documentNumber || 'CC. ???'}
                     </span>
                  </div>

                  {/* Delete Button (Hover) */}
                  {employees.length > 1 && isActive && (
                        <button 
                            onClick={(e) => handleDeleteEmployee(emp.id, e)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 shadow-sm transition-opacity opacity-0 group-hover:opacity-100"
                            title="Eliminar Empleado"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
              </div>
            );
          })}

          {/* Add New Tab Button */}
          <button
            onClick={handleAddEmployee}
            disabled={employees.length >= 10}
            className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
              employees.length >= 10 
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-500 hover:bg-blue-600 hover:text-white hover:shadow-md'
            }`}
            title="Agregar Empleado"
          >
            <Plus className="w-5 h-5" />
          </button>
      </div>

      {/* Editor for Active Employee */}
      <div className="relative transform transition-all duration-300">
          <InputForm 
            title={`Datos: ${activeEmployee.name}`}
            values={activeEmployee} 
            onChange={handleUpdateEmployee} 
          />
      </div>

    </div>
  );
};

export default EmployeeManager;
