'use client';

import { SupabaseClient } from '@supabase/supabase-js';
import { getLocalClients, clearLocalClients, LocalClient } from './local-storage';

export interface MigrationResult {
    success: boolean;
    migrated: number;
    errors: string[];
}

/**
 * Migrates local client data from localStorage to Supabase
 * Called when a guest user logs in or creates an account
 */
export async function migrateLocalDataToSupabase(
    userId: string,
    supabase: SupabaseClient
): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: true,
        migrated: 0,
        errors: []
    };

    const localClients = getLocalClients();

    if (localClients.length === 0) {
        return result; // Nothing to migrate
    }

    for (const client of localClients) {
        try {
            const { error } = await supabase
                .from('clients')
                .insert({
                    user_id: userId,
                    name: client.name,
                    nit: client.nit,
                    classification: client.classification,
                    tax_regime: client.tax_regime,
                    iva_periodicity: client.iva_periodicity,
                    is_retention_agent: client.is_retention_agent,
                    has_gmf: client.has_gmf,
                    requires_exogena: client.requires_exogena,
                    has_patrimony_tax: client.has_patrimony_tax,
                    alert_days: client.alert_days,
                    email_alert: client.email_alert,
                    whatsapp_alert: client.whatsapp_alert
                });

            if (error) {
                result.errors.push(`Error migrating ${client.name}: ${error.message}`);
            } else {
                result.migrated++;
            }
        } catch (err) {
            result.errors.push(`Error migrating ${client.name}: ${String(err)}`);
        }
    }

    // Only clear localStorage if all migrations succeeded
    if (result.errors.length === 0) {
        clearLocalClients();
    } else {
        result.success = false;
    }

    return result;
}

/**
 * Checks if there is local data that could be migrated
 */
export function hasLocalDataToMigrate(): boolean {
    const localClients = getLocalClients();
    return localClients.length > 0;
}

/**
 * Gets count of local clients for migration prompt
 */
export function getLocalDataCount(): number {
    return getLocalClients().length;
}
