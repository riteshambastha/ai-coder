export interface OpenAIConfig {
    apiKey: string;
    model?: string;
  }
  
  export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }
  
  export interface OpenAIResponse {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    error?: {
      message: string;
    };
  }