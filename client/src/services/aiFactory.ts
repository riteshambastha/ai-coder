import { OpenAIService } from './openai';
import { ClaudeService } from './claude';

export type AIProvider = 'openai' | 'claude';

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export class AIServiceFactory {
  static createService(config: AIServiceConfig) {
    switch (config.provider) {
      case 'openai':
        return new OpenAIService({
          apiKey: config.apiKey,
          model: config.model
        });
      case 'claude':
        return new ClaudeService({
          apiKey: config.apiKey,
          model: config.model
        });
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}