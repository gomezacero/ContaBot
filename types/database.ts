export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    name: string
                    phone: string | null
                    occupation: 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE' | null
                    role: string
                    firm_name: string | null
                    membership_type: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    name: string
                    phone?: string | null
                    occupation?: 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE' | null
                    role?: string
                    firm_name?: string | null
                    membership_type?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    phone?: string | null
                    occupation?: 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE' | null
                    role?: string
                    firm_name?: string | null
                    membership_type?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            clients: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    nit: string | null
                    classification: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE' | null
                    tax_regime: string | null
                    iva_periodicity: 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE' | null
                    is_retention_agent: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    nit?: string | null
                    classification?: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE' | null
                    tax_regime?: string | null
                    iva_periodicity?: 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE' | null
                    is_retention_agent?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    nit?: string | null
                    classification?: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE' | null
                    tax_regime?: string | null
                    iva_periodicity?: 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE' | null
                    is_retention_agent?: boolean
                    created_at?: string
                }
            }
            employees: {
                Row: {
                    id: string
                    client_id: string
                    name: string
                    document_number: string | null
                    job_title: string | null
                    contract_type: string | null
                    base_salary: number
                    risk_level: string
                    include_transport_aid: boolean
                    is_exempt: boolean
                    start_date: string | null
                    end_date: string | null
                    deductions_config: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    client_id: string
                    name: string
                    document_number?: string | null
                    job_title?: string | null
                    contract_type?: string | null
                    base_salary: number
                    risk_level?: string
                    include_transport_aid?: boolean
                    is_exempt?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    deductions_config?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    client_id?: string
                    name?: string
                    document_number?: string | null
                    job_title?: string | null
                    contract_type?: string | null
                    base_salary?: number
                    risk_level?: string
                    include_transport_aid?: boolean
                    is_exempt?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    deductions_config?: Json
                    created_at?: string
                }
            }
            payroll_records: {
                Row: {
                    id: string
                    employee_id: string
                    period_start: string
                    period_end: string
                    calculation_data: Json
                    net_pay: number
                    total_employer_cost: number
                    pdf_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    employee_id: string
                    period_start: string
                    period_end: string
                    calculation_data: Json
                    net_pay: number
                    total_employer_cost: number
                    pdf_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    employee_id?: string
                    period_start?: string
                    period_end?: string
                    calculation_data?: Json
                    net_pay?: number
                    total_employer_cost?: number
                    pdf_url?: string | null
                    created_at?: string
                }
            }
            expense_documents: {
                Row: {
                    id: string
                    client_id: string
                    file_name: string
                    file_url: string | null
                    document_type: 'INVOICE' | 'SPREADSHEET'
                    entity: string | null
                    document_date: string | null
                    total_amount: number
                    confidence_score: number
                    raw_text: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    client_id: string
                    file_name: string
                    file_url?: string | null
                    document_type: 'INVOICE' | 'SPREADSHEET'
                    entity?: string | null
                    document_date?: string | null
                    total_amount: number
                    confidence_score?: number
                    raw_text?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    client_id?: string
                    file_name?: string
                    file_url?: string | null
                    document_type?: 'INVOICE' | 'SPREADSHEET'
                    entity?: string | null
                    document_date?: string | null
                    total_amount?: number
                    confidence_score?: number
                    raw_text?: string | null
                    created_at?: string
                }
            }
            expense_items: {
                Row: {
                    id: string
                    document_id: string
                    description: string
                    quantity: number
                    unit_price: number
                    total: number
                    category: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    document_id: string
                    description: string
                    quantity?: number
                    unit_price?: number
                    total: number
                    category?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    document_id?: string
                    description?: string
                    quantity?: number
                    unit_price?: number
                    total?: number
                    category?: string | null
                    created_at?: string
                }
            }
            tax_calendar_configs: {
                Row: {
                    id: string
                    client_id: string
                    is_simple_regime: boolean
                    wealth_situation: string | null
                    sectoral_taxes: string[]
                    alert_days: number[]
                    email_enabled: boolean
                    whatsapp_enabled: boolean
                    target_emails: string[]
                    target_phone: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    client_id: string
                    is_simple_regime?: boolean
                    wealth_situation?: string | null
                    sectoral_taxes?: string[]
                    alert_days?: number[]
                    email_enabled?: boolean
                    whatsapp_enabled?: boolean
                    target_emails?: string[]
                    target_phone?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    client_id?: string
                    is_simple_regime?: boolean
                    wealth_situation?: string | null
                    sectoral_taxes?: string[]
                    alert_days?: number[]
                    email_enabled?: boolean
                    whatsapp_enabled?: boolean
                    target_emails?: string[]
                    target_phone?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            api_usage: {
                Row: {
                    id: string
                    user_id: string
                    usage_date: string
                    ocr_requests_count: number
                    files_processed: number
                    bytes_processed: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    usage_date?: string
                    ocr_requests_count?: number
                    files_processed?: number
                    bytes_processed?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    usage_date?: string
                    ocr_requests_count?: number
                    files_processed?: number
                    bytes_processed?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            liquidation_records: {
                Row: {
                    id: string
                    employee_id: string
                    hire_date: string
                    termination_date: string
                    termination_reason: string | null
                    days_worked: number
                    calculation_data: Json
                    net_pay: number
                    pdf_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    employee_id: string
                    hire_date: string
                    termination_date: string
                    termination_reason?: string | null
                    days_worked: number
                    calculation_data: Json
                    net_pay: number
                    pdf_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    employee_id?: string
                    hire_date?: string
                    termination_date?: string
                    termination_reason?: string | null
                    days_worked?: number
                    calculation_data?: Json
                    net_pay?: number
                    pdf_url?: string | null
                    created_at?: string
                }
            }
        }
    }
}

// Tipos de uso de API para el frontend (sistema DIARIO)
export interface ApiUsageStats {
    daily: {
        files_processed: number
        bytes_processed: number
    }
    limits: {
        daily_files: number
        daily_bytes_mb: number
        max_file_size_mb: number
    }
    remaining: {
        daily_files: number
        daily_bytes: number
    }
    percentage: {
        files: number
        bytes: number
    }
}

export type MembershipType = 'FREEMIUM' | 'PRO' | 'ENTERPRISE'

// ===========================================
// SOFT DELETE TYPES
// ===========================================

// Columns added to tables with soft delete support
export interface SoftDeleteColumns {
    deleted_at: string | null
    deleted_by: string | null
}

// Audit log table type
export interface AuditLog {
    Row: {
        id: string
        table_name: string
        record_id: string
        action: 'SOFT_DELETE' | 'RESTORE' | 'HARD_DELETE'
        user_id: string | null
        user_email: string | null
        created_at: string
        record_snapshot: Json | null
        reason: string | null
    }
    Insert: {
        id?: string
        table_name: string
        record_id: string
        action: 'SOFT_DELETE' | 'RESTORE' | 'HARD_DELETE'
        user_id?: string | null
        user_email?: string | null
        created_at?: string
        record_snapshot?: Json | null
        reason?: string | null
    }
}

// Soft delete function response types
export interface SoftDeleteResult {
    success: boolean
    deleted_at?: string
    record_id?: string
    error?: string
}

export interface RestoreResult {
    success: boolean
    restored_at?: string
    record_id?: string
    error?: string
}

export interface BulkDeleteResult {
    success: boolean
    deleted_count?: number
    error?: string
}

// Deleted record for recovery UI
export interface DeletedRecord {
    table_name: string
    id: string
    display_name: string
    deleted_at: string
    deleted_by: string | null
    record_snapshot?: Json
}

// Tables that support soft delete
export type DeletableTable =
    | 'clients'
    | 'employees'
    | 'payroll_records'
    | 'liquidation_records'
    | 'ocr_results'
