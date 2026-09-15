'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../shared/lib/api-client';
import type { ChatConfig, ChatRequest, ChatResponse } from '../interfaces/chat';

/**
 * Asked once per session and cached hard: whether the assistant exists is a
 * deployment fact, not something that changes while someone is browsing.
 */
export function useChatConfig() {
  return useQuery({
    queryKey: ['chat', 'config'],
    queryFn: () => apiGet<ChatConfig>('/chat/config'),
    staleTime: 30 * 60_000,
    // A missing assistant is not worth retrying at every mount — the widget
    // simply stays hidden.
    retry: false,
  });
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (payload: ChatRequest) => apiPost<ChatResponse>('/chat', payload),
    // No toast here: a chat failure belongs in the transcript, where the
    // question that caused it is still on screen and can be retried.
  });
}
