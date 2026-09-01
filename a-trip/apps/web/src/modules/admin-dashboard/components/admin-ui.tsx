'use client';

import type { ReactNode } from 'react';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/admin-ui.module.css';

export { styles as adminUi };

export function AdminTopbar({
  title,
  meta,
  breadcrumb,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  breadcrumb?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.topbar}>
      <div className={styles.topbarHeading}>
        {breadcrumb ? <p className={styles.breadcrumb}>{breadcrumb}</p> : null}
        <h1 className={styles.topbarTitle}>
          {title}
          {meta ? <span className={styles.topbarMeta}>{meta}</span> : null}
        </h1>
      </div>
      {children ? <div className={styles.topbarActions}>{children}</div> : null}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(styles.panel, className)}>{children}</div>;
}

export function PanelHead({
  title,
  hint,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.panelHead}>
      <div>
        <h2 className={styles.panelTitle}>{title}</h2>
        {hint ? <p className={styles.panelHint}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export type PillTone = 'success' | 'warning' | 'danger' | 'neutral';

const PILL_TONE: Record<PillTone, string> = {
  success: styles.pillSuccess,
  warning: styles.pillWarning,
  danger: styles.pillDanger,
  neutral: styles.pillNeutral,
};

export function Pill({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={cn(styles.pill, PILL_TONE[tone])}>
      {dot ? <span className={styles.pillDot} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className={styles.segmented} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(styles.segment, option.value === value && styles.segmentActive)}
        >
          {option.label}
          {option.count !== undefined ? <span className={styles.segmentCount}>{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(styles.toggle, checked && styles.toggleOn)}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 8);
  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          className={cn(styles.pageBtn, n === page && styles.pageBtnActive)}
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={styles.pageBtn}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
