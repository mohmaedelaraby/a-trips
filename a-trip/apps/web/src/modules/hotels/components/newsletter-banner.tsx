'use client';

import * as React from 'react';
import { Button } from '../../../shared/components/button';
import { Input } from '../../../shared/components/form-controls';
import styles from '../styles/newsletter-banner.module.css';

export function NewsletterBanner() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div>
          <h2 className={styles.heading}>Get local rates before they go public</h2>
          <p className={styles.subheading}>One email a week. Egypt hotel deals, nothing else.</p>
        </div>

        {sent ? (
          <p className={styles.confirmed}>You&apos;re subscribed — thanks!</p>
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
              placeholder="your@email.com"
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
