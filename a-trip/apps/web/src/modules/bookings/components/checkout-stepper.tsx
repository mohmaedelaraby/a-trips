import { Logo } from '../../../shared/components/logo';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/checkout-stepper.module.css';

const STEPS = [
  { n: 1, label: 'Your details' },
  { n: 2, label: 'Confirmation' },
];

export function CheckoutStepper({ step }: { step: 1 | 2 }) {
  return (
    <header className={styles.header}>
      <div className={`container-page ${styles.row}`}>
        <Logo inverted />
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.n} className={styles.step}>
              {i > 0 ? <span className={styles.connector} /> : null}
              <div className={styles.stepInner}>
                <span className={cn(styles.badge, step >= s.n ? styles.badgeActive : styles.badgeInactive)}>
                  {s.n}
                </span>
                <span className={cn(styles.label, step >= s.n ? styles.labelActive : styles.labelInactive)}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
