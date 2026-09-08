'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useProfile, useUpdateProfile } from '../../../../modules/auth/hooks/use-auth';
import { Field, Input } from '../../../../shared/components/form-controls';
import { Button } from '../../../../shared/components/button';
import { Skeleton } from '../../../../shared/components/skeleton';
import { useTranslation } from '../../../../shared/i18n/use-translation';
import styles from '../../styles/account.module.css';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile.data) {
      reset({
        name: profile.data.name,
        phone: profile.data.phone ?? '',
        dateOfBirth: profile.data.dateOfBirth ?? '',
      });
    }
  }, [profile.data, reset]);

  if (profile.isLoading) {
    return <Skeleton className="h-96 w-full max-w-xl" />;
  }

  return (
    <div className={styles.profileCard}>
      <h2 className={styles.profileTitle}>{t('ui.account.profileSettings')}</h2>

      <form
        onSubmit={handleSubmit((values) =>
          updateProfile.mutate({
            name: values.name,
            phone: values.phone || null,
            dateOfBirth: values.dateOfBirth || null,
          }),
        )}
        className={styles.profileForm}
      >
        <div className={styles.profileGrid}>
          <Field label={t('ui.account.name')} htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>
          <Field label={t('ui.checkout.phone')} htmlFor="phone">
            <Input id="phone" type="tel" {...register('phone')} />
          </Field>
        </div>
        <Field label={t('ui.checkout.email')}>
          <Input value={profile.data?.email ?? ''} disabled />
        </Field>
        <Field label={t('ui.account.dateOfBirth')} htmlFor="dateOfBirth">
          <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
        </Field>
        <Field label={t('ui.account.password')}>
          <div className={styles.passwordRow}>
            <Input value="••••••••" disabled className={styles.passwordInput} />
            <a href="/account/profile" className={styles.changeLink}>
              Change
            </a>
          </div>
        </Field>
        <Button type="submit" loading={updateProfile.isPending} className={styles.saveBtn}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
