import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={clsx(
                'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
                {
                    'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500':
                        variant === 'primary',
                    'bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-slate-500':
                        variant === 'secondary',
                    'bg-transparent text-slate-300 hover:bg-slate-800 focus:ring-slate-500':
                        variant === 'ghost',
                    'px-3 py-1.5 text-sm': size === 'sm',
                    'px-4 py-2 text-base': size === 'md',
                    'px-6 py-3 text-lg': size === 'lg',
                    'opacity-50 cursor-not-allowed': disabled,
                },
                className
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
