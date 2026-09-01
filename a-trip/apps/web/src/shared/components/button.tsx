'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import styles from '../styles/button.module.css';

const buttonVariants = cva(styles.base, {
  variants: {
    variant: {
      primary: styles.primary,
      accent: styles.accent,
      outline: styles.outline,
      ghost: styles.ghost,
      danger: styles.danger,
      link: styles.link,
    },
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
      icon: styles.icon,
    },
    block: { true: styles.block, false: '' },
  },
  defaultVariants: { variant: 'primary', size: 'md', block: false },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, loading = false, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {/* Slot requires exactly one child, so the spinner is only added on a real button. */}
      {loading && !asChild ? (
        <>
          <Loader2 className={styles.spinner} aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { buttonVariants };
