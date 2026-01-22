import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    hoverable?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
    children,
    className,
    hoverable = false,
    padding = 'md',
    ...props
}: CardProps) {
    return (
        <div
            className={clsx(
                'bg-slate-800 rounded-xl border border-slate-700 transition-all duration-200',
                {
                    'hover:border-slate-600 hover:bg-slate-750 cursor-pointer': hoverable,
                    'p-0': padding === 'none',
                    'p-3': padding === 'sm',
                    'p-4': padding === 'md',
                    'p-6': padding === 'lg',
                },
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
