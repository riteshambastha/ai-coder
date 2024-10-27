// src/services/openai.ts
import type { OpenAIConfig, OpenAIMessage, OpenAIResponse } from '../types';

interface OpenAIConfig {
    apiKey: string;
    model?: string;
  }
  
  interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }
  
  interface OpenAIResponse {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    error?: {
      message: string;
    };
  }
  
  class OpenAIService {
    private apiKey: string;
    private model: string;
  
    constructor(config: OpenAIConfig) {
      this.apiKey = config.apiKey;
      this.model = config.model || 'gpt-4-turbo-preview';
    }
  
    async analyze(code: string, prompt: string, language?: string): Promise<string> {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: `You are an expert ${language || 'programming'} developer assistant. Analyze code and provide helpful suggestions.`
              },
              {
                role: 'user',
                content: `Language: ${language}\n\nCode:\n${code}\n\nRequest: ${prompt}`
              }
            ],
            temperature: 0.7
          })
        });
  
        const data: OpenAIResponse = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Unknown API error');
        }
  
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI API');
        }
  
        return data.choices[0].message.content;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`OpenAI API Error: ${error.message}`);
        } else {
          throw new Error('An unknown error occurred');
        }
      }
    }
  
    async suggestCompletion(code: string, language: string): Promise<string> {
      return this.analyze(code, "Suggest how to complete this code snippet", language);
    }
  
    async suggestRefactor(code: string, language: string): Promise<string> {
      return this.analyze(code, "Suggest how to refactor this code for better performance and readability", language);
    }
  
    async reviewCode(code: string, language: string): Promise<string> {
      return this.analyze(
        code,
        "Review this code for potential bugs, security issues, and improvements. Format the response with clear sections for: 1) Bugs & Issues 2) Security Concerns 3) Improvements 4) Best Practices",
        language
      );
    }
  
    async explainCode(code: string, language: string): Promise<string> {
      return this.analyze(
        code,
        "Explain what this code does in detail, breaking down the key components and logic",
        language
      );
    }
  }
  
  export { OpenAIService };
  