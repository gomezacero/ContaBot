'use server';

import { createClient } from '@/lib/supabase/server';
import { PayrollInput, PayrollResult } from '@/types/payroll';
import { revalidatePath } from 'next/cache';

// Get all clients for the current user
export async function getClients() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
}

// Get employees for a specific client
export async function getEmployees(clientId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('client_id', clientId)
        .order('name');

    if (error) throw error;
    return data;
}

// Create a new employee
export async function createEmployee(clientId: string, employee: Partial<PayrollInput>) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('employees')
        .insert({
            client_id: clientId,
            name: employee.name || 'Nuevo Empleado',
            document_number: employee.documentNumber,
            job_title: employee.jobTitle,
            contract_type: employee.contractType || 'INDEFINIDO',
            base_salary: employee.baseSalary || 1423500,
            risk_level: employee.riskLevel || 'I',
            include_transport_aid: employee.includeTransportAid ?? true,
            is_exempt: employee.isExempt ?? true,
            start_date: employee.startDate,
            end_date: employee.endDate,
            deductions_config: employee.deductionsParameters || {},
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
    return data;
}

// Update an employee
export async function updateEmployee(employeeId: string, employee: Partial<PayrollInput>) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('employees')
        .update({
            name: employee.name,
            document_number: employee.documentNumber,
            job_title: employee.jobTitle,
            contract_type: employee.contractType,
            base_salary: employee.baseSalary,
            risk_level: employee.riskLevel,
            include_transport_aid: employee.includeTransportAid,
            is_exempt: employee.isExempt,
            start_date: employee.startDate,
            end_date: employee.endDate,
            deductions_config: employee.deductionsParameters,
        })
        .eq('id', employeeId)
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
    return data;
}

// Delete an employee
export async function deleteEmployee(employeeId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
}

// Save a payroll calculation
export async function savePayrollRecord(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    result: PayrollResult
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('payroll_records')
        .insert({
            employee_id: employeeId,
            period_start: periodStart,
            period_end: periodEnd,
            calculation_data: result,
            net_pay: result.monthly.netPay,
            total_employer_cost: result.monthly.employerCosts.totalEmployerCost,
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
    return data;
}

// Get payroll history for an employee
export async function getPayrollHistory(employeeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
}

// Create a new client
export async function createClient_db(clientData: {
    name: string;
    nit?: string;
    classification?: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE';
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('clients')
        .insert({
            user_id: user.id,
            name: clientData.name,
            nit: clientData.nit,
            classification: clientData.classification || 'JURIDICA',
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
    return data;
}

// Get all employees with their client info (for the nomina page)
export async function getAllEmployeesWithClients() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('employees')
        .select(`
      *,
      clients (
        id,
        name,
        nit
      )
    `)
        .order('name');

    if (error) throw error;
    return data;
}
