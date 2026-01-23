/**
 * SearchBar Component
 * 
 * Global search bar with debounced input and suggestions.
 * Premium glassmorphism design with focus states.
 * 
 * @module components/molecules/SearchBar
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    suggestions?: string[];
    onSuggestionClick?: (suggestion: string) => void;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    placeholder = 'Trend ara...',
    isLoading = false,
    suggestions = [],
    onSuggestionClick,
    className = '',
}: SearchBarProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClear = useCallback(() => {
        onChange('');
        inputRef.current?.focus();
    }, [onChange]);

    const handleSuggestionClick = useCallback((suggestion: string) => {
        if (onSuggestionClick) {
            onSuggestionClick(suggestion);
        } else {
            onChange(suggestion);
        }
        setShowSuggestions(false);
    }, [onChange, onSuggestionClick]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSuggestions(false);
            inputRef.current?.blur();
        }
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div
                className={`
                    relative flex items-center gap-3 px-4 py-3
                    bg-slate-800/60 backdrop-blur-sm rounded-xl
                    border transition-all duration-200
                    ${isFocused
                        ? 'border-indigo-500/50 ring-2 ring-indigo-500/20 bg-slate-800/80'
                        : 'border-slate-700/50 hover:border-slate-600/50'
                    }
                `}
            >
                {/* Search Icon / Loading */}
                <div className="flex-shrink-0">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    ) : (
                        <Search className={`w-5 h-5 transition-colors ${isFocused ? 'text-indigo-400' : 'text-slate-500'}`} />
                    )}
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-sm"
                />

                {/* Clear Button */}
                {value && (
                    <button
                        onClick={handleClear}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-slate-700 transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                    </button>
                )}

                {/* Keyboard Shortcut Hint */}
                {!isFocused && !value && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                        <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 font-mono">/</kbd>
                    </div>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                        >
                            <Search className="w-4 h-4 text-slate-500" />
                            <span className="truncate">{suggestion}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
