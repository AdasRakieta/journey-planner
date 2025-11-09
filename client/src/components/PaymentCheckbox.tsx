import React from 'react';
import { Check } from 'lucide-react';

interface PaymentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const PaymentCheckbox: React.FC<PaymentCheckboxProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label = 'Opłacono'
}) => {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer text-sm text-gh-text-secondary hover:text-gh-text-primary transition-colors select-none"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`
          w-5 h-5 rounded border-2 transition-all
          ${checked 
            ? 'bg-green-500 border-green-500' 
            : 'bg-gh-canvas-default border-gh-border-default'
          }
          ${!disabled && 'peer-focus:ring-2 peer-focus:ring-green-500/20'}
          ${disabled && 'opacity-50 cursor-not-allowed'}
          flex items-center justify-center
        `}>
          {checked && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
      <span className={disabled ? 'opacity-50' : ''}>{label}</span>
    </label>
  );
};
