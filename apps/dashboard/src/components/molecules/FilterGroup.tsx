import { Button } from '../atoms';
import { clsx } from 'clsx';

interface FilterOption<T> {
    value: T;
    label: string;
    icon?: React.ReactNode;
}

interface FilterGroupProps<T extends string> {
    label: string;
    options: FilterOption<T>[];
    value: T;
    onChange: (value: T) => void;
}

export function FilterGroup<T extends string>({
    label,
    options,
    value,
    onChange,
}: FilterGroupProps<T>) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-400">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        variant={value === option.value ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onChange(option.value)}
                        className={clsx('flex items-center gap-1.5')}
                    >
                        {option.icon}
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
