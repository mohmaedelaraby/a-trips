'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import styles from '../styles/form-controls.module.css';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return <LabelPrimitive.Root ref={ref} className={cn(styles.label, className)} {...props} />;
});

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(styles.input, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(styles.textarea, className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className={styles.selectWrap}>
      <select ref={ref} className={cn(styles.select, className)} {...props}>
        {children}
      </select>
      <ChevronDown className={styles.selectChevron} aria-hidden />
    </div>
  );
});

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root ref={ref} className={cn(styles.checkbox, className)} {...props}>
      <CheckboxPrimitive.Indicator className={styles.checkboxIndicator}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className={styles.fieldError}>{children}</p>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(styles.field, className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className={styles.required}>*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
