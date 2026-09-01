'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useLogin } from '../../../modules/auth/hooks/use-auth';
import styles from '../styles/admin-login.module.css';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.brand}>
          ATrips<span className={styles.brandDot}>.</span>
        </span>
        <span className={styles.portal}>Admin portal</span>

        <h1 className={styles.title}>Staff sign in</h1>

        <form onSubmit={handleSubmit((values) => login.mutate(values))} className={styles.form} noValidate>
          <div>
            <label htmlFor="email" className={styles.label}>
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="omar@atrips.com"
              className={styles.input}
              {...register('email')}
            />
            {errors.email ? <p className={styles.error}>{errors.email.message}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={styles.input}
              {...register('password')}
            />
            {errors.password ? <p className={styles.error}>{errors.password.message}</p> : null}
          </div>

          {login.isError ? (
            <p className={styles.formError}>
              {login.error instanceof Error ? login.error.message : 'Sign in failed. Check your details.'}
            </p>
          ) : null}

          <button type="submit" className={styles.submit} disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footnote}>
          Access is granted by a super admin. Lost your password? Contact{' '}
          <span className={styles.footnoteStrong}>ops@atrips.com</span>.
        </p>

        <Link href="/sign-in" className={styles.guestLink}>
          Looking for the traveller sign in?
        </Link>
      </div>
    </div>
  );
}
