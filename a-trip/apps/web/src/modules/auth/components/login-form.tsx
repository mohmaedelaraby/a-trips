'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Checkbox, Field, Input } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import { useLogin } from '../hooks/use-auth';
import { toast } from '../../../shared/stores/toast.store';
import styles from '../styles/auth-forms.module.css';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const login = useLogin();
  const [showPassword, setShowPassword] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>
        New here?{' '}
        <Link href="/register" className={styles.link}>
          Create an account
        </Link>
      </p>

      <form onSubmit={handleSubmit((values) => login.mutate(values))} className={styles.form}>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>

        <div>
          <div className={styles.passwordRow}>
            <label htmlFor="password" className={styles.passwordLabel}>
              Password<span className={styles.required}>*</span>
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot?
            </Link>
          </div>
          <div className={styles.passwordWrap}>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={styles.passwordInput}
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className={styles.togglePassword}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password ? <p className={styles.passwordError}>{errors.password.message}</p> : null}
        </div>

        <label className={styles.keepSignedIn}>
          <Checkbox defaultChecked />
          Keep me signed in
        </label>

        <Button type="submit" size="lg" loading={login.isPending}>
          Sign in
        </Button>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          or
          <span className={styles.dividerLine} />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => toast.error('Google sign-in is not available yet')}
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.6 5.6 0 0 1-2.4 3.62v3h3.86c2.26-2.09 3.56-5.17 3.56-8.86z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.28 6.61l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
