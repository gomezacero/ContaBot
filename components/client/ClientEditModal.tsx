'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Building2,
    Phone,
    Mail,
    MapPin,
    FileText,
    Bell,
    ChevronDown,
    ChevronUp,
    Loader2,
    Check,
    AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Tipos para el cliente completo
export interface ClientData {
    id: string;
    name: string;
    nit: string | null;
    // Contacto
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    department?: string | null;
    // Clasificación tributaria
    classification: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE' | null;
    tax_regime: 'ORDINARIO' | 'SIMPLE' | null;
    iva_periodicity: 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE' | null;
    is_retention_agent: boolean;
    // Impuestos adicionales
    has_gmf?: boolean;
    requires_exogena?: boolean;
    has_patrimony_tax?: boolean;
    // Impuestos especiales 2026
    has_carbon_tax?: boolean;
    has_beverage_tax?: boolean;
    has_fuel_tax?: boolean;
    has_plastic_tax?: boolean;
    // Obligaciones especiales
    requires_rub?: boolean;
    requires_transfer_pricing?: boolean;
    requires_country_report?: boolean;
    // Alertas
    alert_days?: number[];
    email_alert?: boolean;
    target_emails?: string[];
    whatsapp_alert?: boolean;
    target_phone?: string | null;
}

interface ClientEditModalProps {
    clientId: string;
    onClose: () => void;
    onSave: () => void;
}

// Departamentos de Colombia
const DEPARTAMENTOS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlantico', 'Bogota D.C.', 'Bolivar',
    'Boyaca', 'Caldas', 'Caqueta', 'Casanare', 'Cauca', 'Cesar', 'Choco',
    'Cordoba', 'Cundinamarca', 'Guainia', 'Guaviare', 'Huila', 'La Guajira',
    'Magdalena', 'Meta', 'Narino', 'Norte de Santander', 'Putumayo', 'Quindio',
    'Risaralda', 'San Andres y Providencia', 'Santander', 'Sucre', 'Tolima',
    'Valle del Cauca', 'Vaupes', 'Vichada'
];

// Componente de sección colapsable
function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = true
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
            >
                <div className="flex items-center gap-2 text-emerald-600">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 space-y-4 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
}

// Componente de checkbox estilizado
function Checkbox({
    label,
    checked,
    onChange,
    description
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checked
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-zinc-300 group-hover:border-zinc-400'
                }`}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                </div>
            </div>
            <div className="flex-1">
                <span className="text-sm font-medium text-zinc-700">{label}</span>
                {description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
                )}
            </div>
        </label>
    );
}

export function ClientEditModal({ clientId, onClose, onSave }: ClientEditModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState<ClientData>({
        id: clientId,
        name: '',
        nit: null,
        classification: 'JURIDICA',
        tax_regime: 'ORDINARIO',
        iva_periodicity: 'BIMESTRAL',
        is_retention_agent: false,
    });

    // Montar portal en el cliente
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Cargar datos del cliente
    useEffect(() => {
        const loadClient = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', clientId)
                    .single();

                if (error) throw error;

                setFormData({
                    ...data,
                    // Asegurar valores por defecto
                    classification: data.classification || 'JURIDICA',
                    tax_regime: data.tax_regime || 'ORDINARIO',
                    iva_periodicity: data.iva_periodicity || 'BIMESTRAL',
                    is_retention_agent: data.is_retention_agent || false,
                    has_gmf: data.has_gmf || false,
                    requires_exogena: data.requires_exogena || false,
                    has_patrimony_tax: data.has_patrimony_tax || false,
                    has_carbon_tax: data.has_carbon_tax || false,
                    has_beverage_tax: data.has_beverage_tax || false,
                    has_fuel_tax: data.has_fuel_tax || false,
                    has_plastic_tax: data.has_plastic_tax || false,
                    requires_rub: data.requires_rub || false,
                    requires_transfer_pricing: data.requires_transfer_pricing || false,
                    requires_country_report: data.requires_country_report || false,
                    alert_days: data.alert_days || [30, 15, 7, 3, 1],
                    email_alert: data.email_alert || false,
                    target_emails: data.target_emails || [],
                    whatsapp_alert: data.whatsapp_alert || false,
                    target_phone: data.target_phone || null,
                });
            } catch (err) {
                console.error('Error loading client:', err);
                setError('Error al cargar los datos del cliente');
            } finally {
                setLoading(false);
            }
        };

        loadClient();
    }, [clientId, supabase]);

    // Guardar cambios
    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    name: formData.name,
                    nit: formData.nit,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    department: formData.department,
                    classification: formData.classification,
                    tax_regime: formData.tax_regime,
                    iva_periodicity: formData.iva_periodicity,
                    is_retention_agent: formData.is_retention_agent,
                    has_gmf: formData.has_gmf,
                    requires_exogena: formData.requires_exogena,
                    has_patrimony_tax: formData.has_patrimony_tax,
                    has_carbon_tax: formData.has_carbon_tax,
                    has_beverage_tax: formData.has_beverage_tax,
                    has_fuel_tax: formData.has_fuel_tax,
                    has_plastic_tax: formData.has_plastic_tax,
                    requires_rub: formData.requires_rub,
                    requires_transfer_pricing: formData.requires_transfer_pricing,
                    requires_country_report: formData.requires_country_report,
                    alert_days: formData.alert_days,
                    email_alert: formData.email_alert,
                    target_emails: formData.target_emails,
                    whatsapp_alert: formData.whatsapp_alert,
                    target_phone: formData.target_phone,
                })
                .eq('id', clientId);

            if (error) throw error;

            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving client:', err);
            setError('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    // Actualizar campo del formulario
    const updateField = <K extends keyof ClientData>(field: K, value: ClientData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Toggle día de alerta
    const toggleAlertDay = (day: number) => {
        const currentDays = formData.alert_days || [];
        if (currentDays.includes(day)) {
            updateField('alert_days', currentDays.filter(d => d !== day));
        } else {
            updateField('alert_days', [...currentDays, day].sort((a, b) => b - a));
        }
    };

    // No renderizar hasta que esté montado (para portal)
    if (!mounted) return null;

    const modalContent = loading ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        </div>
    ) : (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900">Editar Empresa</h2>
                            <p className="text-xs text-zinc-500">Configura la informacion de tu cliente</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-200 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Información Básica */}
                    <CollapsibleSection title="Informacion Basica" icon={Building2} defaultOpen={true}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Razon Social / Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-medium"
                                    placeholder="Nombre de la empresa o persona"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    NIT
                                </label>
                                <input
                                    type="text"
                                    value={formData.nit || ''}
                                    onChange={(e) => updateField('nit', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-medium font-mono"
                                    placeholder="900123456-7"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Clasificacion
                                </label>
                                <select
                                    value={formData.classification || 'JURIDICA'}
                                    onChange={(e) => updateField('classification', e.target.value as ClientData['classification'])}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-medium"
                                >
                                    <option value="NATURAL">Persona Natural</option>
                                    <option value="JURIDICA">Persona Juridica</option>
                                    <option value="GRAN_CONTRIBUYENTE">Gran Contribuyente</option>
                                </select>
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* Contacto */}
                    <CollapsibleSection title="Contacto" icon={Phone} defaultOpen={true}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => updateField('email', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                                        placeholder="correo@empresa.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Telefono
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                                        placeholder="3001234567"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Direccion
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={(e) => updateField('address', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                                        placeholder="Calle 123 # 45-67"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    value={formData.city || ''}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                                    placeholder="Bogota"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Departamento
                                </label>
                                <select
                                    value={formData.department || ''}
                                    onChange={(e) => updateField('department', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                                >
                                    <option value="">Seleccionar...</option>
                                    {DEPARTAMENTOS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* Configuración Tributaria */}
                    <CollapsibleSection title="Configuracion Tributaria" icon={FileText} defaultOpen={true}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Regimen Tributario
                                </label>
                                <select
                                    value={formData.tax_regime || 'ORDINARIO'}
                                    onChange={(e) => updateField('tax_regime', e.target.value as ClientData['tax_regime'])}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-medium"
                                >
                                    <option value="ORDINARIO">Regimen Ordinario</option>
                                    <option value="SIMPLE">Regimen SIMPLE (RST)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Periodicidad IVA
                                </label>
                                <select
                                    value={formData.iva_periodicity || 'BIMESTRAL'}
                                    onChange={(e) => updateField('iva_periodicity', e.target.value as ClientData['iva_periodicity'])}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-medium"
                                    disabled={formData.tax_regime === 'SIMPLE'}
                                >
                                    <option value="BIMESTRAL">Bimestral</option>
                                    <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                    <option value="NONE">No aplica</option>
                                </select>
                                {formData.tax_regime === 'SIMPLE' && (
                                    <p className="text-xs text-amber-600 mt-1">Regimen SIMPLE no declara IVA separado</p>
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-3 pt-2">
                                <Checkbox
                                    label="Agente Retenedor"
                                    checked={formData.is_retention_agent}
                                    onChange={(checked) => updateField('is_retention_agent', checked)}
                                    description="Retiene en la fuente sobre pagos a terceros"
                                />
                                <Checkbox
                                    label="GMF (4x1000)"
                                    checked={formData.has_gmf || false}
                                    onChange={(checked) => updateField('has_gmf', checked)}
                                    description="Sujeto al Gravamen a Movimientos Financieros"
                                />
                                <Checkbox
                                    label="Informacion Exogena"
                                    checked={formData.requires_exogena || false}
                                    onChange={(checked) => updateField('requires_exogena', checked)}
                                    description="Obligado a reportar informacion a la DIAN"
                                />
                                <Checkbox
                                    label="Impuesto al Patrimonio"
                                    checked={formData.has_patrimony_tax || false}
                                    onChange={(checked) => updateField('has_patrimony_tax', checked)}
                                    description="Sujeto al impuesto sobre el patrimonio"
                                />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* Impuestos Especiales 2026 */}
                    <CollapsibleSection title="Impuestos Especiales 2026" icon={FileText} defaultOpen={false}>
                        <div className="space-y-3">
                            <Checkbox
                                label="Impuesto al Carbono"
                                checked={formData.has_carbon_tax || false}
                                onChange={(checked) => updateField('has_carbon_tax', checked)}
                                description="Aplica para combustibles fosiles"
                            />
                            <Checkbox
                                label="Bebidas Ultraprocesadas"
                                checked={formData.has_beverage_tax || false}
                                onChange={(checked) => updateField('has_beverage_tax', checked)}
                                description="Impuesto sobre bebidas azucaradas"
                            />
                            <Checkbox
                                label="Gasolina / ACPM"
                                checked={formData.has_fuel_tax || false}
                                onChange={(checked) => updateField('has_fuel_tax', checked)}
                                description="Impuesto nacional sobre combustibles"
                            />
                            <Checkbox
                                label="Plasticos de un Solo Uso"
                                checked={formData.has_plastic_tax || false}
                                onChange={(checked) => updateField('has_plastic_tax', checked)}
                                description="Impuesto sobre productos plasticos desechables"
                            />
                        </div>
                    </CollapsibleSection>

                    {/* Obligaciones Especiales */}
                    <CollapsibleSection title="Obligaciones Especiales" icon={FileText} defaultOpen={false}>
                        <div className="space-y-3">
                            <Checkbox
                                label="Registro Unico de Beneficiarios (RUB)"
                                checked={formData.requires_rub || false}
                                onChange={(checked) => updateField('requires_rub', checked)}
                                description="Obligado a reportar beneficiarios finales"
                            />
                            <Checkbox
                                label="Precios de Transferencia"
                                checked={formData.requires_transfer_pricing || false}
                                onChange={(checked) => updateField('requires_transfer_pricing', checked)}
                                description="Operaciones con vinculados economicos del exterior"
                            />
                            <Checkbox
                                label="Informe Pais por Pais"
                                checked={formData.requires_country_report || false}
                                onChange={(checked) => updateField('requires_country_report', checked)}
                                description="Grupos multinacionales con ingresos consolidados"
                            />
                        </div>
                    </CollapsibleSection>

                    {/* Alertas */}
                    <CollapsibleSection title="Configuracion de Alertas" icon={Bell} defaultOpen={false}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                    Dias de Anticipacion
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[30, 15, 7, 3, 1].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleAlertDay(day)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                (formData.alert_days || []).includes(day)
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                        >
                                            {day} {day === 1 ? 'dia' : 'dias'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 space-y-3">
                                <Checkbox
                                    label="Notificaciones por Email"
                                    checked={formData.email_alert || false}
                                    onChange={(checked) => updateField('email_alert', checked)}
                                />
                                {formData.email_alert && (
                                    <div className="ml-8">
                                        <input
                                            type="text"
                                            value={(formData.target_emails || []).join(', ')}
                                            onChange={(e) => updateField('target_emails', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                                            placeholder="email1@ejemplo.com, email2@ejemplo.com"
                                        />
                                        <p className="text-xs text-zinc-400 mt-1">Separar multiples emails con coma</p>
                                    </div>
                                )}

                                <Checkbox
                                    label="Notificaciones por WhatsApp"
                                    checked={formData.whatsapp_alert || false}
                                    onChange={(checked) => updateField('whatsapp_alert', checked)}
                                />
                                {formData.whatsapp_alert && (
                                    <div className="ml-8">
                                        <input
                                            type="tel"
                                            value={formData.target_phone || ''}
                                            onChange={(e) => updateField('target_phone', e.target.value)}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-emerald-500 text-sm"
                                            placeholder="573001234567"
                                        />
                                        <p className="text-xs text-zinc-400 mt-1">Incluir codigo de pais (57 para Colombia)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CollapsibleSection>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
