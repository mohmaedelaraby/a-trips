'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Field, Input } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import styles from '../styles/auth-forms.module.css';

const schema = z.string().email();

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(email);
    if (!result.success) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setSent(true);
  };

  return (
    <div>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.subtitle}>Enter the email on your account and we&apos;ll send a reset link.</p>

      {sent ? (
        <div className={styles.confirmBox}>
          <div className={styles.confirmCard}>
            <p className={styles.confirmCardTitle}>Link sent.</p>
            <p className="mt-1">Check {email} — the link expires in 30 minutes.</p>
          </div>
          <Link href="/sign-in" className={styles.backLink}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Email" htmlFor="email" required error={error ?? undefined}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg">
            Send reset link
          </Button>
          <Link href="/sign-in" className={styles.backLink}>
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
