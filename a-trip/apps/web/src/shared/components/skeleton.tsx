import { cn } from '../lib/utils';
import styles from '../styles/skeleton.module.css';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn(styles.skeleton, className)} />;
}
