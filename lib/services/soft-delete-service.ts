'use server';

/**
 * Soft Delete Service for ContaBot
 * Handles all deletion, restoration, and audit operations
 */

import { createClient } from '@/lib/supabase/server';
import type {
    SoftDeleteResult,
    RestoreResult,
    BulkDeleteResult,
    DeletedRecord,
    DeletableTable,
    Json
} from '@/types/database';

/**
 * Soft delete a single record
 * Records are marked as deleted but remain in the database
 */
export async function softDelete(
    tableName: DeletableTable,
    recordId: string,
    reason?: string
): Promise<SoftDeleteResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('soft_delete_record', {
        p_table_name: tableName,
        p_record_id: recordId,
        p_reason: reason || 'User requested deletion'
    });

    if (error) {
        console.error('Soft delete error:', error);
        return { success: false, error: error.message };
    }

    return data as SoftDeleteResult;
}

/**
 * Soft delete multiple records by filter
 * All matching records are logged to audit before deletion
 */
export async function softDeleteBulk(
    tableName: DeletableTable,
    filterColumn: string,
    filterValue: string,
    reason?: string
): Promise<BulkDeleteResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('soft_delete_bulk', {
        p_table_name: tableName,
        p_filter_column: filterColumn,
        p_filter_value: filterValue,
        p_reason: reason || 'Bulk deletion by user'
    });

    if (error) {
        console.error('Bulk soft delete error:', error);
        return { success: false, error: error.message };
    }

    return data as BulkDeleteResult;
}

/**
 * Restore a soft-deleted record
 * The record becomes visible again in normal queries
 */
export async function restore(
    tableName: DeletableTable,
    recordId: string
): Promise<RestoreResult> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('restore_deleted_record', {
        p_table_name: tableName,
        p_record_id: recordId
    });

    if (error) {
        console.error('Restore error:', error);
        return { success: false, error: error.message };
    }

    return data as RestoreResult;
}

/**
 * Get all deleted records for a user (for recovery UI)
 * Returns records from audit_log with SOFT_DELETE action
 */
export async function getDeletedRecords(
    tableName?: DeletableTable,
    limit: number = 50
): Promise<DeletedRecord[]> {
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

/**
 * Get audit history for a specific record
 * Shows all delete/restore operations for tracking
 */
export async function getRecordAuditHistory(
    tableName: DeletableTable,
    recordId: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching audit history:', error);
        return [];
    }

    return data;
}

/**
 * Check if a record is currently soft-deleted
 */
export async function isDeleted(
    tableName: DeletableTable,
    recordId: string
): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from(tableName)
        .select('deleted_at')
        .eq('id', recordId)
        .single();

    if (error) {
        return false;
    }

    return data?.deleted_at !== null;
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
