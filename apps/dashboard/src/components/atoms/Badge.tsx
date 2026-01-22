import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: React.ReactNode;
}

export function Badge({
    variant = 'default',
    size = 'md',
    className,
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center font-medium rounded-full',
                {
                    'bg-slate-700 text-slate-300': variant === 'default',
                    'bg-green-900/50 text-green-400': variant === 'success',
                    'bg-amber-900/50 text-amber-400': variant === 'warning',
                    'bg-red-900/50 text-red-400': variant === 'danger',
                    'bg-blue-900/50 text-blue-400': variant === 'info',
                    'px-2 py-0.5 text-xs': size === 'sm',
                    'px-2.5 py-1 text-sm': size === 'md',
                },
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
