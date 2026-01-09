'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

// Tipo de cliente simplificado para el contexto
export interface ClientInfo {
    id: string;
    name: string;
    nit: string | null;
}

interface ClientContextType {
    clients: ClientInfo[];
    selectedClientId: string | null;
    selectedClient: ClientInfo | null;
    setSelectedClientId: (id: string | null) => void;
    refreshClients: () => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const STORAGE_KEY = 'contabio_selected_client';

const ClientContext = createContext<ClientContextType | null>(null);

interface ClientProviderProps {
    children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
    const supabase = createClient();
    const [clients, setClients] = useState<ClientInfo[]>([]);
    const [selectedClientId, setSelectedClientIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Cargar clientes del usuario
    const loadClients = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsAuthenticated(false);
                setClients([]);
                setSelectedClientIdState(null);
                setIsLoading(false);
                return;
            }

            setIsAuthenticated(true);

            const { data, error } = await supabase
                .from('clients')
                .select('id, name, nit')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('name');

            if (error) {
                console.error('Error loading clients:', error);
                setClients([]);
            } else {
                setClients(data || []);
            }
        } catch (error) {
            console.error('Error in loadClients:', error);
            setClients([]);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // Cargar cliente seleccionado desde localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSelectedClientIdState(stored);
            }
        }
    }, []);

    // Cargar clientes al montar
    useEffect(() => {
        loadClients();
    }, [loadClients]);

    // Escuchar cambios de autenticación
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                loadClients();
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setClients([]);
                setSelectedClientIdState(null);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, loadClients]);

    // Setter que también persiste en localStorage
    const setSelectedClientId = useCallback((id: string | null) => {
        setSelectedClientIdState(id);
        if (typeof window !== 'undefined') {
            if (id) {
                localStorage.setItem(STORAGE_KEY, id);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Obtener cliente seleccionado completo
    const selectedClient = clients.find(c => c.id === selectedClientId) || null;

    // Validar que el cliente seleccionado existe en la lista
    useEffect(() => {
        if (selectedClientId && clients.length > 0) {
            const exists = clients.some(c => c.id === selectedClientId);
            if (!exists) {
                // Si el cliente ya no existe, limpiar la selección
                setSelectedClientId(null);
            }
        }
    }, [clients, selectedClientId, setSelectedClientId]);

    // Función para refrescar la lista de clientes
    const refreshClients = useCallback(async () => {
        await loadClients();
    }, [loadClients]);

    return (
        <ClientContext.Provider
            value={{
                clients,
                selectedClientId,
                selectedClient,
                setSelectedClientId,
                refreshClients,
                isLoading,
                isAuthenticated,
            }}
        >
            {children}
        </ClientContext.Provider>
    );
}

/**
 * Hook para acceder al contexto de clientes
 * @example
 * const { clients, selectedClientId, setSelectedClientId, refreshClients } = useClient();
 */
export function useClient(): ClientContextType {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClient debe usarse dentro de un ClientProvider');
    }
    return context;
}
