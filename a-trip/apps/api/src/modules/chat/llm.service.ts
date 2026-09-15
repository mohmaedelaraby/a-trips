import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal chat-completions client. Groq by default, because it is the free
 * tier this project actually runs on — set LLM_API_KEY and nothing else and
 * the assistant works.
 *
 * It is still written against the OpenAI *wire format* rather than against
 * Groq, because that format is what Groq, OpenRouter, Together, DeepSeek,
 * Mistral and a local Ollama all serve. Switching provider is therefore
 * LLM_BASE_URL + LLM_MODEL, not a rewrite. See .env.example.
 *
 * One trap worth knowing: reasoning models (Groq's `openai/gpt-oss-*`) put
 * their answer in a `reasoning` field and return `content: ""`, which reads
 * here as an empty reply. The default below is a plain instruct model for
 * that reason.
 *
 * Plain fetch, no SDK, same as the PayPal client next door.
 */

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
/** A reply that has not started arriving by now is not worth the guest's wait. */
const REQUEST_TIMEOUT_MS = 30_000;

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  /** False when no key is set, so the API still boots and the widget hides itself. */
  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  private get apiKey(): string {
    return this.config.get<string>('LLM_API_KEY')?.trim() ?? '';
  }

  /**
   * Trailing slashes trimmed: the path is appended directly. Blank falls back
   * to the default rather than through it — `LLM_BASE_URL=` left empty in a
   * .env is a variable someone meant to fill in, not a request for an empty
   * base URL, and `??` alone would have posted to `/chat/completions`.
   */
  private get baseUrl(): string {
    const configured = this.config.get<string>('LLM_BASE_URL')?.trim();
    return (configured || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  get model(): string {
    return this.config.get<string>('LLM_MODEL')?.trim() || DEFAULT_MODEL;
  }

  async complete(messages: LlmMessage[], maxTokens = 500): Promise<string> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'The assistant is not configured. Set LLM_API_KEY on the API (a Groq key from console.groq.com/keys works as-is).',
      );
    }

    // Without this an unreachable provider holds the request open until the
    // client gives up, tying up a connection for nothing.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          // Low, not zero: answers stay close to the hotel data they are given
          // while still reading like prose rather than a database dump.
          temperature: 0.3,
        }),
        signal: abort.signal,
      });

      const body = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

      if (!response.ok) {
        // The provider's own message can name a bad key, an unknown model or a
        // spent quota — worth logging, never worth forwarding to the browser.
        this.logger.error(
          `LLM request failed (${response.status}): ${body?.error?.message ?? 'no detail'}`,
        );
        throw new ServiceUnavailableException('The assistant is unavailable right now.');
      }

      const reply = body?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        this.logger.error('LLM returned no message content');
        throw new ServiceUnavailableException('The assistant had nothing to say — try again.');
      }
      return reply;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('The assistant took too long to reply.');
      }
      this.logger.error(`LLM request threw: ${String(error)}`);
      throw new ServiceUnavailableException('The assistant is unavailable right now.');
    } finally {
      clearTimeout(timer);
    }
  }
}
