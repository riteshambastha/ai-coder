//import React, { useState } from 'react';
import { useState } from 'react';
import { Send, Loader, Maximize2, Minimize2, Settings } from 'lucide-react';
import { ChatResponse } from '../types';

interface AIPanelProps {
  responses: ChatResponse[];
  suggestions?: string;
  loading?: boolean;
  onSend: (prompt: string) => void;
  onSettingsClick: () => void;
}

const AIPanel: React.FC<AIPanelProps> = ({
  responses,
  suggestions,
  loading,
  onSend,
  onSettingsClick
}) => {
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSend = () => {
    if (prompt.trim()) {
      onSend(prompt);
      setPrompt('');
    }
  };

  return (
    <div className={`border-t ${expanded ? 'h-full' : 'h-64'}`}>
      <div className="bg-gray-50 p-2 flex justify-between items-center border-b">
        <span className="font-medium">AI Assistant</span>
        <div className="flex gap-2">
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onClick={onSettingsClick}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
      
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {responses.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="bg-blue-50 p-2 rounded">
                <strong>You:</strong> {item.prompt}
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <strong>Assistant:</strong> {item.response}
              </div>
            </div>
          ))}
          {suggestions && (
            <div className="bg-yellow-50 p-2 rounded">
              <strong>Suggestions:</strong>
              <pre className="whitespace-pre-wrap mt-1">{suggestions}</pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <textarea
              className="flex-1 p-2 border rounded resize-none"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about the code..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600 flex items-center justify-center"
              onClick={handleSend}
              disabled={loading}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;