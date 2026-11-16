import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  showLabel = false
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-full border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B42C9] dark:focus-visible:ring-[#A855F7] ${
        isDark
          ? 'text-[#F5D061] bg-[#181124] hover:bg-[#251A38] border-[#34244C]'
          : 'text-[#8B42C9] bg-[#F2EBDD] hover:bg-[#E8DEC9] border-[#DFD5C2]'
      } ${showLabel ? 'px-3 py-1.5' : ''} ${className}`}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#F5D061] transition-transform duration-200 hover:rotate-12" />
      ) : (
        <Moon className="w-4 h-4 text-[#8B42C9] transition-transform duration-200 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-medium whitespace-nowrap">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
