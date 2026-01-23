/**
 * Toast Notification System
 * 
 * Provides context-based toast notifications with auto-dismiss,
 * multiple types (success, error, warning, info), and stacking.
 * 
 * @module components/atoms/Toast
 */

import {
    createContext,
    useContext,
    useCallback,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

export interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_DURATION = 5000; // 5 seconds
const MAX_TOASTS = 5;

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const TOAST_STYLES: Record<ToastType, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

const ICON_STYLES: Record<ToastType, string> = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
};

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================
// Toast Item Component
// ============================================================

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const Icon = TOAST_ICONS[toast.type];

    useEffect(() => {
        if (toast.duration === 0) return; // Persistent toast

        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration ?? DEFAULT_DURATION);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
                shadow-lg animate-slide-in-right
                ${TOAST_STYLES[toast.type]}
            `}
            role="alert"
        >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`} />

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>
                )}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Bildirimi kapat"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ============================================================
// Toast Container Component
// ============================================================

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
            aria-live="polite"
            aria-label="Bildirimler"
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// ============================================================
// Toast Provider
// ============================================================

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        setToasts((prev) => {
            const newToasts = [...prev, { ...toast, id }];
            // Limit max toasts
            if (newToasts.length > MAX_TOASTS) {
                return newToasts.slice(-MAX_TOASTS);
            }
            return newToasts;
        });
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message, duration: 8000 }); // Errors stay longer
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    const value: ToastContextValue = {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Animation styles */}
            <style>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </ToastContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
}
