// src/hooks/useAI.ts
import { useState, useEffect } from 'react';
import { AIServiceFactory, type AIProvider } from '../services/aiFactory';
import type { AIService } from '../types/ai';

interface UseAIOptions {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
}

export const useAI = (options: UseAIOptions = {}) => {
  const [service, setService] = useState<AIService | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const apiKey = options.apiKey || 
      (options.provider === 'claude' 
        ? import.meta.env.VITE_CLAUDE_API_KEY 
        : import.meta.env.VITE_OPENAI_API_KEY);

    if (apiKey) {
      try {
        const aiService = AIServiceFactory.createService({
          provider: options.provider || 'claude',
          apiKey,
          model: options.model
        });
        setService(aiService);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to initialize AI service'));
        setService(null);
      }
    }
  }, [options.provider, options.apiKey, options.model]);

  const analyze = async (code: string, prompt: string, language?: string) => {
    if (!service) throw new Error('AI service not initialized');
    setLoading(true);
    try {
      const result = await service.analyze(code, prompt, language);
      setError(null);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to analyze code');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    service,
    loading,
    error,
    analyze,
    initialized: !!service
  };
};

