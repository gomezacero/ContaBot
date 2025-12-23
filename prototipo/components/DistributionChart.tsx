import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PayrollFinancials } from '../types';

interface Props {
  data: PayrollFinancials;
}

const DistributionChart: React.FC<Props> = ({ data }) => {
  const chartData = [
    { name: 'Salario Neto', value: data.netPay, color: '#22c55e' }, // Green
    { name: 'Seguridad Social (Empresa)', value: data.employerCosts.health + data.employerCosts.pension + data.employerCosts.arl, color: '#3b82f6' }, // Blue
    { name: 'Parafiscales', value: data.employerCosts.sena + data.employerCosts.icbf + data.employerCosts.compensationBox, color: '#f59e0b' }, // Amber
    { name: 'Prestaciones', value: data.employerCosts.cesantias + data.employerCosts.interesesCesantias + data.employerCosts.prima + data.employerCosts.vacations, color: '#ec4899' }, // Pink
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DistributionChart;