'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Field, Input } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import { useRegister } from '../hooks/use-auth';
import styles from '../styles/auth-forms.module.css';

const schema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const register_ = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div>
      <h1 className={styles.title}>Create your account</h1>
      <p className={styles.subtitle}>Takes under a minute.</p>

      <form
        onSubmit={handleSubmit((values) =>
          register_.mutate({
            name: `${values.firstName} ${values.lastName}`.trim(),
            email: values.email,
            password: values.password,
            phone: values.phone,
          }),
        )}
        className={styles.form}
      >
        <div className={styles.fieldGrid}>
          <Field label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
            <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
          </Field>
          <Field label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Phone" htmlFor="phone" hint="Optional — used to reach you about your bookings">
          <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
        </Field>
        <Field label="Password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters">
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={register_.isPending}>
          Create account
        </Button>
        <p className={styles.footnote}>
          By registering you agree to our{' '}
          <a href="#" className={styles.link}>
            terms
          </a>{' '}
          and{' '}
          <a href="#" className={styles.link}>
            privacy policy
          </a>
          .
        </p>
        <p className={styles.footnoteLine}>
          Already have an account?{' '}
          <Link href="/sign-in" className={styles.link}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
