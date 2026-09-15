'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BellRing, Globe, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useProfile, useUpdateProfile } from '../../../../modules/auth/hooks/use-auth';
import { Field, Input } from '../../../../shared/components/form-controls';
import { Button } from '../../../../shared/components/button';
import { Skeleton } from '../../../../shared/components/skeleton';
import { LocaleSwitcher } from '../../../../shared/components/locale-switcher';
import { StatusChip } from '../../../../shared/components/status-chip';
import { comingSoonHref } from '../../../../shared/lib/coming-soon';
import { cn, formatDate, initials } from '../../../../shared/lib/utils';
import { useTranslation } from '../../../../shared/i18n/use-translation';
import styles from '../../styles/account.module.css';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type TabValue = 'personal' | 'preferences' | 'security';

export default function ProfilePage() {
  const { t } = useTranslation();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [tab, setTab] = React.useState<TabValue>('personal');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (profile.data) {
      reset({
        name: profile.data.name,
        phone: profile.data.phone ?? '',
        dateOfBirth: profile.data.dateOfBirth ?? '',
      });
    }
  }, [profile.data, reset]);

  if (profile.isLoading) {
    return (
      <div className={styles.profileLoading}>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const user = profile.data;

  const TABS: Array<{ value: TabValue; label: string; icon: typeof UserRound }> = [
    { value: 'personal', label: t('ui.account.tabPersonal'), icon: UserRound },
    { value: 'preferences', label: t('ui.account.tabPreferences'), icon: Globe },
    { value: 'security', label: t('ui.account.tabSecurity'), icon: ShieldCheck },
  ];

  // What the traveller still owes us. Phone and date of birth are what a hotel
  // asks for at check-in, so an incomplete profile is worth naming rather than
  // leaving the guest to discover at the desk.
  const checklist = [
    { label: t('ui.account.name'), done: Boolean(user?.name) },
    { label: t('ui.checkout.email'), done: Boolean(user?.email) },
    { label: t('ui.checkout.phone'), done: Boolean(user?.phone) },
    { label: t('ui.account.dateOfBirth'), done: Boolean(user?.dateOfBirth) },
  ];
  const completed = checklist.filter((item) => item.done).length;
  const completeness = Math.round((completed / checklist.length) * 100);

  return (
    <div className={styles.profileWrap}>
      <header className={styles.profileHeader}>
        <span className={styles.profileAvatar}>{user ? initials(user.name) : '··'}</span>
        <div className={styles.profileIdentity}>
          <h1 className={styles.profileName}>{user?.name ?? '—'}</h1>
          <p className={styles.profileEmail}>
            <Mail className={styles.profileEmailIcon} aria-hidden />
            {user?.email}
          </p>
          {user?.createdAt ? (
            <p className={styles.profileMeta}>
              {t('ui.account.memberSince', { date: formatDate(user.createdAt, 'long') })}
            </p>
          ) : null}
        </div>

        <div className={styles.completeness}>
          <div className={styles.completenessHead}>
            <span>{t('ui.account.profileStrength')}</span>
            <strong>{completeness}%</strong>
          </div>
          <div
            className={styles.meter}
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('ui.account.profileStrength')}
          >
            <span className={styles.meterFill} style={{ width: `${completeness}%` }} />
          </div>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li
                key={item.label}
                className={item.done ? styles.checklistDone : styles.checklistTodo}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className={`${styles.tabs} no-scrollbar`} role="tablist" aria-label={t('ui.account.profileSettings')}>
        {TABS.map((item) => {
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.value)}
              className={cn(styles.tab, active ? styles.tabActive : styles.tabInactive)}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'personal' ? (
        <div className={styles.profileCard}>
          <div>
            <h2 className={styles.profileTitle}>{t('ui.account.tabPersonal')}</h2>
            <p className={styles.profileSubtitle}>{t('ui.account.personalHint')}</p>
          </div>

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
              <Field
                label={t('ui.checkout.phone')}
                htmlFor="phone"
                hint={t('ui.account.phoneHint')}
              >
                <Input id="phone" type="tel" {...register('phone')} />
              </Field>
            </div>
            <Field label={t('ui.checkout.email')} hint={t('ui.account.emailLocked')}>
              <Input value={user?.email ?? ''} disabled />
            </Field>
            <Field
              label={t('ui.account.dateOfBirth')}
              htmlFor="dateOfBirth"
              hint={t('ui.account.dobHint')}
            >
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
            </Field>

            <div className={styles.formActions}>
              <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
                {t('ui.common.save')}
              </Button>
              {isDirty ? (
                <span className={styles.unsaved}>{t('ui.account.unsavedChanges')}</span>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'preferences' ? (
        <div className={styles.profileCard}>
          <div>
            <h2 className={styles.profileTitle}>{t('ui.account.tabPreferences')}</h2>
            <p className={styles.profileSubtitle}>{t('ui.account.preferencesHint')}</p>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>{t('ui.common.language')}</p>
              <p className={styles.settingHint}>{t('ui.account.languageHint')}</p>
            </div>
            <LocaleSwitcher />
          </div>

          {/* Nothing stores a notification preference yet, so this states the
              current behaviour instead of offering a switch that saves nowhere. */}
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>
                <BellRing className={styles.settingIcon} aria-hidden />
                {t('ui.account.notifications')}
              </p>
              <p className={styles.settingHint}>{t('ui.account.notificationsHint')}</p>
            </div>
            <Button variant="outline" asChild>
              <Link href={comingSoonHref('Notification settings')}>{t('ui.common.soon')}</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'security' ? (
        <div className={styles.profileCard}>
          <div>
            <h2 className={styles.profileTitle}>{t('ui.account.tabSecurity')}</h2>
            <p className={styles.profileSubtitle}>{t('ui.account.securityHint')}</p>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>
                <KeyRound className={styles.settingIcon} aria-hidden />
                {t('ui.account.password')}
              </p>
              {/* The API has no change-password endpoint; the reset-by-email
                  flow is the one that actually works, so that is what is
                  offered rather than a field that cannot be saved. */}
              <p className={styles.settingHint}>{t('ui.account.passwordHint')}</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/forgot-password">{t('ui.account.resetPassword')}</Link>
            </Button>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>{t('ui.account.accountStatus')}</p>
              <p className={styles.settingHint}>{t('ui.account.accountStatusHint')}</p>
            </div>
            <StatusChip tone={user?.status === 'ACTIVE' ? 'success' : 'warning'}>
              {user?.status ?? '—'}
            </StatusChip>
          </div>
        </div>
      ) : null}
    </div>
  );
}
