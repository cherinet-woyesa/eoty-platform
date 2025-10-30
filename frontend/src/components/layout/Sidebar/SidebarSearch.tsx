import React, { useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SidebarSearch: React.FC<SidebarSearchProps> = ({
  value,
  onChange,
  placeholder = "Search navigation..."
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
        <Search className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-500"
        aria-label="Search navigation"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default React.memo(SidebarSearch);