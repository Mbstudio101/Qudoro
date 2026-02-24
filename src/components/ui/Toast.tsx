import { XCircle, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
}

const variantStyles: Record<ToastVariant, { container: string; Icon: typeof Info }> = {
  success: {
    container: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
    Icon: CheckCircle2,
  },
  error: {
    container: 'border-destructive/40 bg-destructive/10 text-destructive',
    Icon: AlertCircle,
  },
  info: {
    container: 'border-primary/30 bg-primary/10 text-primary',
    Icon: Info,
  },
};

const Toast = ({ message, variant = 'info', onClose }: ToastProps) => {
  const style = variantStyles[variant];
  const Icon = style.Icon;

  return (
    <div
      role="status"
      className={twMerge(
        'fixed top-4 right-4 z-[100] w-[min(92vw,420px)] rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        style.container,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <p className="text-sm leading-5 flex-1">{message}</p>
        {onClose && (
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100" aria-label="Close">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
