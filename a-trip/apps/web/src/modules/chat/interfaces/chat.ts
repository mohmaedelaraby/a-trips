import type { Locale } from '../../../shared/i18n/config';

export interface ChatConfig {
  /** False when the API has no LLM key; the widget hides itself rather than erroring on click. */
  configured: boolean;
  model: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatTurn[];
  locale: Locale;
}

export interface ChatResponse {
  reply: string;
}
