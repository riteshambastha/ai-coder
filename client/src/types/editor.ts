export interface EditorTab {
    id: string;
    path: string;
    name: string;
    content: string;
    isModified: boolean;
    language: string;
  }
  export interface ChatResponse {
    prompt: string;
    response: string;
    timestamp: string;
  }