import type { ReactNode } from 'react';
import { Logo } from '../../../shared/components/logo';
import styles from '../styles/auth-split-layout.module.css';

export function AuthSplitLayout({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.grid}>
      <div className={styles.brandPanel}>
        <Logo inverted />
        <div>
          <h2 className={styles.heading}>{heading}</h2>
          <p className={styles.subheading}>{subheading}</p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>{children}</div>
      </div>
    </div>
  );
}
