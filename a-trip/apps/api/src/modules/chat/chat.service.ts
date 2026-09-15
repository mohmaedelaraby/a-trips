import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService, type LlmMessage } from './llm.service';
import { ChatRepository } from './repositories/chat.repository';
import { toNumber } from '../../common/utils/decimal.util';
import { Locale } from '../../generated/prisma/enums';
import type { ChatRequestDto } from './dto/chat.dto';

/** Hotels named in the prompt. Enough to answer "what do you have in X?" without a huge prompt. */
const CONTEXT_HOTEL_LIMIT = 40;
/** The inventory barely moves minute to minute; re-reading it per message is waste. */
const CONTEXT_TTL_MS = 5 * 60_000;
/** Turns of prior conversation replayed to the model, newest kept. */
const MAX_HISTORY_TURNS = 10;

/**
 * Per-visitor budget. This endpoint is public and spends money on every call,
 * so it needs a ceiling that does not depend on anyone being signed in.
 */
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX_MESSAGES = 20;

interface RateBucket {
  count: number;
  resetAt: number;
}

interface HotelContext {
  text: string;
  expiresAt: number;
}

@Injectable()
export class ChatService {
  private context: HotelContext | null = null;
  private readonly buckets = new Map<string, RateBucket>();

  constructor(
    private readonly llm: LlmService,
    private readonly repository: ChatRepository,
    private readonly config: ConfigService,
  ) {}

  get configured(): boolean {
    return this.llm.configured;
  }

  async reply(dto: ChatRequestDto, clientKey: string): Promise<{ reply: string }> {
    this.consumeRateLimit(clientKey);

    const locale = dto.locale ?? Locale.EN;
    const messages: LlmMessage[] = [
      { role: 'system', content: await this.systemPrompt(locale) },
      // Oldest turns drop first: the recent ones carry the thread, and the
      // whole transcript is re-sent on every message.
      ...(dto.history ?? [])
        .slice(-MAX_HISTORY_TURNS)
        .map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: dto.message },
    ];

    const reply = await this.llm.complete(messages);
    return { reply };
  }

  /**
   * Fixed-window counter keyed by IP.
   *
   * In-process on purpose: one API instance is what this stack runs, and a
   * Redis dependency to rate-limit a help widget would cost more than it
   * saves. Behind more than one instance the effective limit multiplies by
   * the instance count, which is still a ceiling.
   */
  private consumeRateLimit(clientKey: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(clientKey);

    if (!bucket || bucket.resetAt <= now) {
      // Sweep here rather than on a timer: the map only grows on traffic, and
      // this is the only place that traffic arrives.
      if (this.buckets.size > 5_000) {
        for (const [key, value] of this.buckets) {
          if (value.resetAt <= now) this.buckets.delete(key);
        }
      }
      this.buckets.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return;
    }

    if (bucket.count >= RATE_LIMIT_MAX_MESSAGES) {
      const seconds = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        `That is a lot of questions. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count += 1;
  }

  /**
   * The assistant's whole knowledge of this business: what it sells, how
   * booking works, and the rules it answers under.
   *
   * The hotel list is real data rather than a description of it, because the
   * failure mode of a booking assistant is inventing a hotel — grounding it
   * in the actual rows, and telling it to say so when something is missing,
   * is what keeps answers checkable.
   */
  private async systemPrompt(locale: Locale): Promise<string> {
    const taxRate = Number(this.config.get<string>('PRICING_TAX_RATE') ?? '0.1');
    const language =
      locale === Locale.AR
        ? 'Reply in Arabic (العربية). Keep hotel names and prices as written.'
        : 'Reply in English.';

    return [
      'You are the booking assistant for ATrips, a site that sells hand-picked hotels in Egypt direct at local rates.',
      '',
      'HOW THIS SITE WORKS',
      '- Guests search hotels by city, dates and party size, then book a room type for a date range.',
      '- Prices are quoted per night in USD and are tax-inclusive; roughly ' +
        `${Math.round(taxRate * 100)}% of a total is tax. There is no booking fee.`,
      '- Paying holds the rooms, then the ATrips team confirms the booking (usually within 24 hours).',
      '- A guest can see their bookings under "My bookings" once signed in.',
      '- Hotel pages live at /hotels/<slug>; the search page is /hotels.',
      '',
      'RULES',
      '- Only discuss hotels from the inventory below. Never invent a hotel, a price, a room type or an amenity.',
      '- If the answer is not in the inventory or the notes above, say you do not have it and point the guest to the search page or the contact details in the footer.',
      '- You cannot make, change or cancel a booking yourself, and you cannot see a specific guest\'s account. Explain the steps instead.',
      '- Prices shown are starting nightly rates; the exact total depends on the dates chosen, so confirm on the hotel page.',
      '- Be brief: two or three sentences unless asked for detail. No markdown tables.',
      `- ${language}`,
      '',
      'INVENTORY',
      await this.hotelContext(),
    ].join('\n');
  }

  private async hotelContext(): Promise<string> {
    const now = Date.now();
    if (this.context && this.context.expiresAt > now) return this.context.text;

    const hotels = await this.repository.findPublishedHotels(CONTEXT_HOTEL_LIMIT);

    const text = hotels.length
      ? hotels
          .map((hotel) => {
            const prices = hotel.roomTypes.map((room) => toNumber(room.basePrice)).filter(Boolean);
            const from = prices.length ? `from $${Math.min(...prices)}/night` : 'no public rate yet';
            const sleeps = hotel.roomTypes.reduce(
              (most, room) => Math.max(most, room.capacityAdults),
              0,
            );
            const amenities = hotel.amenities.slice(0, 6).join(', ') || 'none listed';
            return `- ${hotel.name} (${hotel.city}, ${hotel.country}) — ${hotel.stars}-star, ${from}, sleeps up to ${sleeps} adults per room, amenities: ${amenities}. Page: /hotels/${hotel.slug}`;
          })
          .join('\n')
      : '(No hotels are published yet.)';

    this.context = { text, expiresAt: now + CONTEXT_TTL_MS };
    return text;
  }
}
