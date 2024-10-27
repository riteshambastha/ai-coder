export interface ClaudeConfig {
    apiKey: string;
    model?: string;
  }
  
  export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface ClaudeResponse {
    content: Array<{
      text: string;
    }>;
    error?: {
      message: string;
    };
  }
  