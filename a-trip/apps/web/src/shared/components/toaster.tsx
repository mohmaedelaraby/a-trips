'use client';

import { CheckCircle2, X, XCircle, Info } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { cn } from '../lib/utils';
import styles from '../styles/toaster.module.css';

const ICON = { success: CheckCircle2, error: XCircle, default: Info } as const;
const TONE = { success: styles.success, error: styles.error, default: styles.default } as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport}>
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div key={t.id} role="status" className={cn(styles.toast, TONE[t.variant])}>
            <Icon className={styles.icon} aria-hidden />
            <div className={styles.body}>
              <p className={styles.title}>{t.title}</p>
              {t.description ? <p className={styles.description}>{t.description}</p> : null}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className={styles.dismiss} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
