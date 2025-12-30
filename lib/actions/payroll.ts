'use server';

import { createClient } from '@/lib/supabase/server';
import { PayrollInput, PayrollResult, LiquidationResult, TerminationReason } from '@/types/payroll';
import { SoftDeleteResult, RestoreResult, DeletedRecord, DeletableTable, Json } from '@/types/database';
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

// Soft delete an employee (can be restored later)
export async function deleteEmployee(employeeId: string, reason?: string): Promise<SoftDeleteResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'employees',
        p_record_id: employeeId,
        p_reason: reason || 'Usuario elimino empleado'
    });

    if (error) {
        console.error('Error soft deleting employee:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/nomina');
    return data as SoftDeleteResult;
}

// Restore a soft-deleted employee
export async function restoreEmployee(employeeId: string): Promise<RestoreResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('restore_deleted_record', {
        p_table_name: 'employees',
        p_record_id: employeeId
    });

    if (error) {
        console.error('Error restoring employee:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/nomina');
    return data as RestoreResult;
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

// ==========================================
// LIQUIDATION ACTIONS
// ==========================================

// Save a liquidation record
export async function saveLiquidationRecord(
    employeeId: string,
    hireDate: string,
    terminationDate: string,
    terminationReason: TerminationReason | null,
    result: LiquidationResult
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('liquidation_records')
        .insert({
            employee_id: employeeId,
            hire_date: hireDate,
            termination_date: terminationDate,
            termination_reason: terminationReason,
            days_worked: result.daysWorked,
            calculation_data: result,
            net_pay: result.netToPay,
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/dashboard/nomina');
    return data;
}

// Get liquidation history for an employee
export async function getLiquidationHistory(employeeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('liquidation_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
}

// Soft delete a liquidation record (can be restored later)
export async function deleteLiquidationRecord(recordId: string, reason?: string): Promise<SoftDeleteResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'liquidation_records',
        p_record_id: recordId,
        p_reason: reason || 'Usuario elimino registro de liquidacion'
    });

    if (error) {
        console.error('Error soft deleting liquidation record:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/nomina');
    return data as SoftDeleteResult;
}

// Restore a soft-deleted liquidation record
export async function restoreLiquidationRecord(recordId: string): Promise<RestoreResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('restore_deleted_record', {
        p_table_name: 'liquidation_records',
        p_record_id: recordId
    });

    if (error) {
        console.error('Error restoring liquidation record:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/nomina');
    return data as RestoreResult;
}

// Update liquidation record with PDF URL
export async function updateLiquidationPdfUrl(recordId: string, pdfUrl: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('liquidation_records')
        .update({ pdf_url: pdfUrl })
        .eq('id', recordId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ==========================================
// SOFT DELETE UTILITY ACTIONS
// ==========================================

// Soft delete a client (can be restored later)
export async function deleteClient(clientId: string, reason?: string): Promise<SoftDeleteResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'clients',
        p_record_id: clientId,
        p_reason: reason || 'Usuario elimino cliente'
    });

    if (error) {
        console.error('Error soft deleting client:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/calendario');
    revalidatePath('/dashboard/nomina');
    return data as SoftDeleteResult;
}

// Restore a soft-deleted client
export async function restoreClient(clientId: string): Promise<RestoreResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('restore_deleted_record', {
        p_table_name: 'clients',
        p_record_id: clientId
    });

    if (error) {
        console.error('Error restoring client:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/calendario');
    revalidatePath('/dashboard/nomina');
    return data as RestoreResult;
}

// Get deleted records for the papelera (trash) UI
export async function getDeletedRecords(tableName?: DeletableTable, limit: number = 50): Promise<DeletedRecord[]> {
    const supabase = await createClient();

    let query = supabase
        .from('audit_log')
        .select('table_name, record_id, record_snapshot, created_at, user_email')
        .eq('action', 'SOFT_DELETE')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (tableName) {
        query = query.eq('table_name', tableName);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching deleted records:', error);
        return [];
    }

    return (data || []).map(row => ({
        table_name: row.table_name,
        id: row.record_id,
        display_name: extractDisplayName(row.record_snapshot as Json, row.table_name),
        deleted_at: row.created_at,
        deleted_by: row.user_email,
        record_snapshot: row.record_snapshot as Json
    }));
}

// Generic restore function for any table
export async function restoreRecord(tableName: DeletableTable, recordId: string): Promise<RestoreResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('restore_deleted_record', {
        p_table_name: tableName,
        p_record_id: recordId
    });

    if (error) {
        console.error(`Error restoring ${tableName} record:`, error);
        return { success: false, error: error.message };
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard/nomina');
    revalidatePath('/dashboard/calendario');
    revalidatePath('/dashboard/gastos');
    return data as RestoreResult;
}

// Helper to extract display name from snapshot
function extractDisplayName(snapshot: Json, tableName: string): string {
    if (!snapshot || typeof snapshot !== 'object') return 'Registro eliminado';

    const record = snapshot as Record<string, unknown>;

    switch (tableName) {
        case 'clients':
        case 'employees':
            return (record.name as string) || 'Sin nombre';
        case 'ocr_results':
            return (record.filename as string) || (record.vendor as string) || 'Documento';
        case 'payroll_records':
            return `Nomina ${record.period_start || ''} - ${record.period_end || ''}`;
        case 'liquidation_records':
            return `Liquidacion ${record.termination_date || ''}`;
        default:
            return (record.name as string) || (record.id as string) || 'Registro';
    }
}
