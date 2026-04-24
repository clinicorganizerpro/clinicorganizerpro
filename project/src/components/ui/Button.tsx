import React, { memo } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[12px] rounded-xl gap-1.5 h-8',
  md: 'px-4 py-2 text-[13px] rounded-xl gap-2 h-9',
  lg: 'px-5 py-2.5 text-[13px] rounded-xl gap-2 h-10',
};

const ButtonComponent: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = `
    inline-flex items-center font-semibold transition-all duration-200 tracking-tight whitespace-nowrap
    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
    ${sizeClasses[size]}
  `;

  const variants: Record<ButtonVariant, string> = {
    primary: `btn-primary-premium text-white hover:scale-[1.02] active:scale-[0.98]`,
    secondary: `
      bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200
      border border-white/[0.08] hover:border-white/[0.13]
      hover:scale-[1.02] active:scale-[0.98]
    `,
    ghost: `bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200 active:scale-[0.98]`,
    danger: `bg-red-500/[0.08] hover:bg-red-500/[0.13] text-red-400 border border-red-500/15 hover:scale-[1.02] active:scale-[0.98]`,
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export const Button = memo(ButtonComponent);
