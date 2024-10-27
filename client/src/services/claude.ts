import type { ClaudeConfig, ClaudeMessage, ClaudeResponse } from '../types/claude';

class ClaudeService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(config: ClaudeConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-sonnet-20240229';
  }

  async analyze(code: string, prompt: string, language?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `As an expert ${language || 'programming'} developer:
                
                Language: ${language}
                
                Code to analyze:
                \`\`\`${language || ''}
                ${code}
                \`\`\`
                
                ${prompt}
                
                Please provide a detailed and well-structured response.`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const data: ClaudeResponse = await response.json();

      if (!data.content?.[0]?.text) {
        throw new Error('Invalid response format from Claude API');
      }

      return data.content[0].text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API Error: ${error.message}`);
      } else {
        throw new Error('An unknown error occurred');
      }
    }
  }

  async suggestCompletion(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please complete this code snippet. Provide the completion with explanatory comments. 
       Consider edge cases and best practices for ${language}.`,
      language
    );
  }

  async suggestRefactor(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please suggest how to refactor this code for better:
       1. Performance
       2. Readability
       3. Maintainability
       4. Error handling
       
       Provide specific recommendations and example code where appropriate.`,
      language
    );
  }

  async reviewCode(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please perform a comprehensive code review addressing:

       1. Bugs & Potential Issues
       2. Security Vulnerabilities
       3. Performance Optimizations
       4. Code Style & Best Practices
       5. Architecture & Design Patterns
       6. Documentation Needs
       
       For each category, provide specific examples and suggested improvements.`,
      language
    );
  }

  async explainCode(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please explain this code in detail:
       
       1. Overall purpose and functionality
       2. Key components and their interactions
       3. Control flow and logic
       4. Important variables and data structures
       5. Any notable algorithms or patterns
       6. Potential edge cases or limitations`,
      language
    );
  }

  async suggestTests(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please suggest comprehensive tests for this code:
       
       1. Unit tests for individual functions/methods
       2. Integration test scenarios
       3. Edge cases to consider
       4. Mock objects needed
       5. Test data suggestions
       
       Provide example test code using common testing frameworks for ${language}.`,
      language
    );
  }

  async improveDocumentation(code: string, language: string): Promise<string> {
    return this.analyze(
      code,
      `Please suggest documentation improvements:
       
       1. Add/improve function and class documentation
       2. Explain complex logic with inline comments
       3. Add usage examples
       4. Document assumptions and limitations
       5. API documentation if applicable
       
       Provide the code with improved documentation.`,
      language
    );
  }
}

export { ClaudeService };
