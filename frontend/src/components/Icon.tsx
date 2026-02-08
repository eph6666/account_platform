interface IconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  filled?: boolean;
}

const sizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export const Icon = ({ name, className = '', size = 'md', filled = false }: IconProps) => {
  const sizeClass = sizeClasses[size];
  const fillClass = filled ? 'material-symbols-outlined-filled' : '';

  return (
    <span
      className={`material-symbols-outlined ${sizeClass} ${fillClass} ${className}`}
      style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
    >
      {name}
    </span>
  );
};
