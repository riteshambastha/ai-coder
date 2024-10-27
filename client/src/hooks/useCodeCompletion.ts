import { useState } from 'react';
import OpenAIService from '../services/openai';

export const useCodeCompletion = (openAIService: OpenAIService | null) => {
  const [suggestions, setSuggestions] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const getSuggestions = async (code: string, language: string) => {
    if (!openAIService) return;

    setLoading(true);
    try {
      const completion = await openAIService.suggestCompletion(code, language);
      setSuggestions(completion);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
    setLoading(false);
  };

  const getCodeReview = async (code: string, language: string) => {
    if (!openAIService) return;

    setLoading(true);
    try {
      const review = await openAIService.reviewCode(code, language);
      setSuggestions(review);
    } catch (error) {
      console.error('Error getting code review:', error);
    }
    setLoading(false);
  };

  return { suggestions, loading, getSuggestions, getCodeReview };
};

