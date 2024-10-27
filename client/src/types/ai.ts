import type { OpenAIConfig, OpenAIMessage, OpenAIResponse } from './openai';
import type { ClaudeConfig, ClaudeMessage, ClaudeResponse } from './claude';

export interface AIService {
  analyze(code: string, prompt: string, language?: string): Promise<string>;
  suggestCompletion(code: string, language: string): Promise<string>;
  suggestRefactor(code: string, language: string): Promise<string>;
  reviewCode(code: string, language: string): Promise<string>;
  explainCode(code: string, language: string): Promise<string>;
}

export type {
  OpenAIConfig,
  OpenAIMessage,
  OpenAIResponse,
  ClaudeConfig,
  ClaudeMessage,
  ClaudeResponse
};