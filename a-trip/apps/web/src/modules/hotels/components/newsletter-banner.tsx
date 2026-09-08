'use client';

import * as React from 'react';
import { Button } from '../../../shared/components/button';
import { Input } from '../../../shared/components/form-controls';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/newsletter-banner.module.css';

export function NewsletterBanner() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div>
          <h2 className={styles.heading}>{t('ui.newsletter.title')}</h2>
          <p className={styles.subheading}>{t('ui.newsletter.subtitle')}</p>
        </div>

        {sent ? (
          <p className={styles.confirmed}>{t('ui.newsletter.subscribed')}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSent(true);
            }}
            className={styles.form}
          >
            <Input
              type="email"
              required
              placeholder={t('ui.newsletter.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.emailInput}
            />
            <Button type="submit" variant="accent" className={styles.subscribeBtn}>
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
