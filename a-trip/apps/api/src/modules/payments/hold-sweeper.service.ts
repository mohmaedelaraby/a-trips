import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Relabels lapsed payment holds as EXPIRED once a minute.
 *
 * This is bookkeeping, not inventory control. Availability already ignores a
 * lapsed hold the moment it passes (see CONSUMES_INVENTORY), so a room is never
 * waiting on this timer to be resold — if the process dies, nothing oversells
 * and nothing stays locked. All that suffers is the label a guest sees.
 *
 * A plain interval rather than @nestjs/schedule, to avoid a dependency for one
 * job. With several API instances they all sweep; updateMany is idempotent, so
 * the duplicate work is harmless.
 */
@Injectable()
export class HoldSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoldSweeperService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly payments: PaymentsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
    // Never keep the process alive just for the sweeper.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sweep(): Promise<void> {
    try {
      await this.payments.expireLapsedHolds();
    } catch (error) {
      // A failed sweep is recoverable: the next tick retries, and inventory was
      // never depending on it.
      this.logger.error(`Hold sweep failed: ${String(error)}`);
    }
  }
}
