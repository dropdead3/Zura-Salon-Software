import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

interface UseAIAssistantReturn {
  response: string;
  isLoading: boolean;
  error: string | null;
  sendMessage: (query: string, conversationHistory?: Message[], organizationId?: string) => Promise<void>;
  reset: () => void;
}

const AI_ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

function friendlyError(status: number, fallback: string): string {
  if (status === 401) return 'Your session has expired. Please refresh and try again.';
  if (status === 403) return 'You don't have access to this feature for the current organization.';
  if (status === 429) return 'Too many requests — please wait a moment and try again.';
  if (status === 402) return 'This feature requires an active subscription.';
  return fallback;
}

export function useAIAssistant(): UseAIAssistantReturn {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResponse('');
    setError(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (query: string, conversationHistory: Message[] = [], organizationId?: string) => {
    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      // Get the user's real session JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Please sign in to use the AI assistant.');
      }

      const messages: Message[] = [
        ...conversationHistory,
        { role: 'user', content: query }
      ];

      const resp = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages, organizationId }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(friendlyError(resp.status, errorData.error || `Request failed with status ${resp.status}`));
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch { /* ignore partial leftovers */ }
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
      console.error('AI Assistant error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    response,
    isLoading,
    error,
    sendMessage,
    reset,
  };
}
