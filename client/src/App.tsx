// src/App.tsx
import { useState, useCallback } from 'react';
import { FolderOpen, Send, Settings, File, ChevronRight, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';

// Constants for file size limits
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PREVIEW_LENGTH = 100000;

// Types
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values(): AsyncIterableIterator<FileSystemHandle>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string): Promise<FileSystemFileHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | ArrayBuffer | ArrayBufferView | Blob): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface ChatMessage {
  id: string;
  timestamp: string;
  prompt: string;
  response: string;
  filePath?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker(): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(): Promise<FileSystemFileHandle>;
  }
}

interface FileStructure {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  size?: number; // Added size property
  children?: FileStructure[];
}

type AIService = 'openai' | 'claude';

// Large File Warning Component
const LargeFileWarning: React.FC<{ size: number }> = ({ size }) => (
  <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">Large File Warning</h3>
        <div className="mt-2 text-sm text-yellow-700">
          <p>This file is {(size / 1024 / 1024).toFixed(2)}MB. For performance reasons, only a preview is shown.</p>
        </div>
      </div>
    </div>
  </div>
);

// ConfirmDialog Component
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  message, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  // State declarations
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileStructure | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false); // New loading state for files
  const [selectedService, setSelectedService] = useState<AIService>('claude');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDirectorySelect, setPendingDirectorySelect] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '',
    claude: import.meta.env.VITE_CLAUDE_API_KEY || localStorage.getItem('claude_api_key') || ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Core directory handling functions
  const processDirectorySelection = async () => {
    setIsLoadingFiles(true);
    try {
      const dirHandle = await window.showDirectoryPicker();
      const structure = await readDirectory(dirHandle);
      
      // Clear everything
      setFileStructure([structure]);
      setSelectedFile(null);
      setFileContent('');
      setChatHistory([]);
      setResponse('');
      localStorage.removeItem('chatHistory');
      
      // Reset dialog state
      setShowConfirmDialog(false);
      setPendingDirectorySelect(false);
    } catch (error) {
      console.error('Error accessing directory:', error);
      setPendingDirectorySelect(false);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDirectorySelect = async () => {
    if (chatHistory.length > 0) {
      setShowConfirmDialog(true);
      setPendingDirectorySelect(true);
      return;
    }
    await processDirectorySelection();
  };

  const handleConfirmNewDirectory = () => {
    processDirectorySelection();
  };

  const handleCancelNewDirectory = () => {
    setShowConfirmDialog(false);
    setPendingDirectorySelect(false);
  };

  const readFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
    try {
      const file = await fileHandle.getFile();
      
      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). 
          For performance reasons, files larger than ${MAX_FILE_SIZE_MB}MB are not fully loaded.`;
      }

      // For large but acceptable files, read only the preview
      if (file.size > MAX_FILE_SIZE_BYTES / 2) {
        const blob = file.slice(0, MAX_PREVIEW_LENGTH);
        const content = await blob.text();
        return content + '\n\n[... File truncated for performance reasons ...]';
      }

      const content = await file.text();
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      return 'Error reading file content';
    }
  };

  const readDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    path = ''
  ): Promise<FileStructure> => {
    const entries: FileStructure[] = [];
    
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        const subDir = await readDirectory(
          await dirHandle.getDirectoryHandle(entry.name),
          `${path}/${entry.name}`
        );
        entries.push(subDir);
      } else if (entry.kind === 'file') {
        const fileHandle = await dirHandle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        const size = file.size;
        
        // Skip very large files
        if (size > MAX_FILE_SIZE_BYTES) {
          entries.push({
            name: entry.name,
            type: 'file',
            path: `${path}/${entry.name}`,
            size,
            content: `File is too large (${(size / 1024 / 1024).toFixed(2)}MB)`
          });
          continue;
        }

        const content = await readFileContent(fileHandle);
        entries.push({
          name: entry.name,
          type: 'file',
          path: `${path}/${entry.name}`,
          size,
          content
        });
      }
    }

    return {
      name: dirHandle.name,
      type: 'directory',
      path,
      children: entries.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      })
    };
  };

  // File Tree Component
  const FileTree = ({ item, level = 0 }: { item: FileStructure; level?: number }) => {
    const [isOpen, setIsOpen] = useState(true);
    const paddingLeft = `${level * 20}px`;

    const handleFileClick = (file: FileStructure) => {
      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        alert(`This file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB) to load in the browser.`);
        return;
      }
      
      console.log('File selected:', file.name);
      if (file.content !== undefined) {
        setSelectedFile(file);
        setFileContent(file.content);
        console.log('Content length:', file.content.length);
      } else {
        console.log('No content in file');
      }
    };

    if (item.type === 'file') {
      const isSelected = selectedFile?.path === item.path;
      const fileSize = item.size ? (item.size / 1024).toFixed(1) + ' KB' : '';
      const isLarge = item.size && item.size > MAX_FILE_SIZE_BYTES;

      return (
        <div
          className={`py-1 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50' : ''
          } ${isLarge ? 'opacity-50' : ''}`}
          style={{ paddingLeft }}
          onClick={() => handleFileClick(item)}
        >
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center">
              <File className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            {fileSize && (
              <span className="text-xs text-gray-400">{fileSize}</span>
            )}
          </div>
          {isLarge && (
            <div className="text-xs text-red-500 ml-6">
              File too large
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div
          className="py-1 cursor-pointer hover:bg-gray-100"
          style={{ paddingLeft }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 mr-2 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2 text-gray-500" />
            )}
            <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
            <span className="text-sm font-medium text-gray-800">{item.name}</span>
          </div>
        </div>
        {isOpen && item.children && (
          <div>
            {item.children.map((child, index) => (
              <FileTree key={`${child.path}-${index}`} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'hpp': 'cpp',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'php': 'php',
      'rb': 'ruby',
      'rs': 'rust',
      'sql': 'sql',
      'swift': 'swift',
      'vue': 'html',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'shell',
      'bash': 'shell',
      'go': 'go'
    };
    return languageMap[extension] || 'plaintext';
  };


  const callOpenAI = async (promptText: string, codeContent: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programming assistant. Analyze code and provide helpful suggestions.'
          },
          {
            role: 'user',
            content: `Code:\n\`\`\`\n${codeContent}\n\`\`\`\n\nQuestion: ${promptText}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API call failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callClaude = async (promptText: string, codeContent: string) => {
    if (!apiKeys.claude) {
      throw new Error('Claude API key is missing');
    }

    const requestBody = {
      model: 'claude-3-sonnet-20240229',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this code and answer the following question:\n\nCode:\n${codeContent}\n\nQuestion: ${promptText}`
          }
        ]
      }],
      max_tokens: 1500,
      temperature: 0.7
    };

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.claude,
          'anthropic-version': '2024-02-29'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error: any) {
      console.error('Claude API Error:', error);
      throw new Error(error.message || 'Failed to get response from Claude');
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    if (!selectedFile?.content) {
      alert('Please select a file first');
      return;
    }
    
    const currentApiKey = selectedService === 'openai' ? apiKeys.openai : apiKeys.claude;
    if (!currentApiKey) {
      setShowSettings(true);
      return;
    }

    setLoading(true);

    try {
      const result = await (selectedService === 'openai' 
        ? callOpenAI(prompt, selectedFile.content)
        : callClaude(prompt, selectedFile.content)
      );
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        prompt,
        response: result,
        filePath: selectedFile.path
      };

      const updatedHistory = [...chatHistory, newMessage];
      setChatHistory(updatedHistory);
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      setResponse(result);
      setPrompt('');
    } catch (error: any) {
      setResponse('Error: ' + error.message);
      if (error.message.includes('API key')) {
        setShowSettings(true);
      }
    } finally {
      setLoading(false);
    }
  };

    const SettingsModal = () => {
        const [openaiKey, setOpenaiKey] = useState(apiKeys.openai);
        const [claudeKey, setClaudeKey] = useState(apiKeys.claude);
    
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">API Settings</h2>
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="sk-..."
                />
                </div>
                <div>
                <label className="block text-sm font-medium mb-1">Claude API Key</label>
                <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="sk-..."
                />
                </div>
                <div className="flex justify-end gap-2">
                <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleSaveSettings(openaiKey, claudeKey)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Save
                </button>
                </div>
            </div>
            </div>
        </div>
        );
    };

    // Add this function with your other functions
    const handleSaveSettings = (openaiKey: string, claudeKey: string) => {
        console.log('Saving API keys...');
        const newApiKeys = {
        openai: openaiKey.trim(),
        claude: claudeKey.trim()
        };
        setApiKeys(newApiKeys);
        localStorage.setItem('openai_api_key', openaiKey.trim());
        localStorage.setItem('claude_api_key', claudeKey.trim());
        setShowSettings(false);
    };


  // Continue with your existing SettingsModal, callOpenAI, callClaude, and handleSubmit functions...
  // [Previous functions remain the same]

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">AI Code Editor</h1>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* File Explorer with Loading State */}
        <div className="w-1/5 bg-white shadow-sm border-r">
          <div className="p-4">
            <button
              onClick={handleDirectorySelect}
              disabled={isLoadingFiles}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-400"
            >
              {isLoadingFiles ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                  Loading Files...
                </div>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open Folder
                </>
              )}
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoadingFiles ? (
              <div className="flex-1 flex items-center justify-center flex-col p-8 text-gray-500">
                <div className="flex flex-col items-center">
                  <div className="animate-pulse flex space-x-4 mb-4">
                    <div className="h-3 w-3 bg-gray-300 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-300 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className="text-sm text-center">
                    Reading directory contents...
                    <br />
                    <span className="text-xs text-gray-400">This might take a moment for large directories</span>
                  </div>
                </div>
              </div>
            ) : fileStructure.length > 0 ? (
              <div className="overflow-auto max-h-[calc(100vh-8rem)]">
                {fileStructure.map((item, index) => (
                  <FileTree key={`${item.path}-${index}`} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 mb-4 mx-auto text-gray-400" />
                  <p>No folder selected</p>
                  <p className="text-sm text-gray-400">Click 'Open Folder' to start</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor Section */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 bg-gray-900">
            {selectedFile ? (
              <div className="h-full flex flex-col">
                <div className="bg-gray-800 text-gray-400 text-sm px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                  <span>{selectedFile.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {getLanguageFromFileName(selectedFile.name)}
                    </span>
                    {selectedFile.size && (
                      <span className="text-xs text-gray-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                </div>
                {selectedFile.size && selectedFile.size > MAX_FILE_SIZE_BYTES / 2 && (
                  <LargeFileWarning size={selectedFile.size} />
                )}
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={getLanguageFromFileName(selectedFile.name)}
                    value={fileContent}
                    theme="vs-dark"
                    loading={
                      <div className="text-white p-4 flex items-center justify-center h-full">
                        <div className="animate-pulse">Loading editor...</div>
                      </div>
                    }
                    options={{
                      readOnly: true,
                      minimap: { enabled: true },
                      fontSize: 14,
                      lineNumbers: 'on',
                      renderLineHighlight: 'gutter',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      folding: true,
                      foldingStrategy: 'indentation',
                      showFoldingControls: 'always',
                      formatOnPaste: true,
                      formatOnType: true,
                      tabSize: 2,
                      padding: { top: 10 },
                      bracketPairColorization: { enabled: true },
                      renderWhitespace: 'selection',
                      guides: {
                        bracketPairs: true,
                        indentation: true
                      },
                      colorDecorators: true,
                      "semanticHighlighting.enabled": true,
                      occurrencesHighlight: true,
                      renderFinalNewline: true,
                      scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible',
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                        useShadows: false
                      }
                    }}
                    onMount={(editor, monaco) => {
                      editor.updateOptions({
                        theme: 'vs-dark'
                      });
                      monaco.editor.defineTheme('custom-dark', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [
                          { token: 'comment', foreground: '6A9955' },
                          { token: 'keyword', foreground: '569CD6' },
                          { token: 'string', foreground: 'CE9178' },
                          { token: 'number', foreground: 'B5CEA8' },
                          { token: 'type', foreground: '4EC9B0' }
                        ],
                        colors: {
                          'editor.background': '#1E1E1E',
                          'editor.foreground': '#D4D4D4',
                          'editor.lineHighlightBackground': '#2F2F2F',
                          'editor.selectionBackground': '#264F78',
                          'editor.inactiveSelectionBackground': '#3A3D41'
                        }
                      });
                      monaco.editor.setTheme('custom-dark');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📁</div>
                  <div>Select a file to view its contents</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel - Your existing chat panel code remains the same */}
        {/* Chat Panel - 30% with fixed width */}
            <div className="w-[30%] border-l border-gray-200 bg-white flex flex-col h-screen">
            {/* Chat History with proper height constraints */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable chat area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((chat) => (
                    <div key={chat.id} className="mb-4 last:mb-0">
                    <div className="bg-gray-50 rounded-lg p-3 mb-2 break-words">
                        <div className="text-xs text-gray-500 mb-1">
                        {new Date(chat.timestamp).toLocaleString()}
                        {chat.filePath && (
                            <span className="ml-2 text-blue-500">
                            {chat.filePath.split('/').pop()}
                            </span>
                        )}
                        </div>
                        <div className="text-sm font-medium">{chat.prompt}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-sm break-words max-w-full">
                        {chat.response}
                        </pre>
                    </div>
                    </div>
                ))}

                {/* Current response display */}
                {response && (
                    <div className="mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-sm break-words max-w-full overflow-x-auto">
                        {response}
                        </pre>
                    </div>
                    </div>
                )}
                </div>

                {/* AI Controls - fixed at bottom */}
                <div className="border-t p-4 bg-white">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                    <input
                        type="radio"
                        id="claude"
                        name="ai-service"
                        value="claude"
                        checked={selectedService === 'claude'}
                        onChange={(e) => setSelectedService(e.target.value as AIService)}
                    />
                    <label htmlFor="claude">Claude</label>
                    </div>
                    <div className="flex items-center gap-2">
                    <input
                        type="radio"
                        id="openai"
                        name="ai-service"
                        value="openai"
                        checked={selectedService === 'openai'}
                        onChange={(e) => setSelectedService(e.target.value as AIService)}
                    />
                    <label htmlFor="openai">OpenAI</label>
                    </div>
                    <button
                    onClick={() => setShowSettings(true)}
                    className="ml-auto p-2 text-gray-500 hover:text-gray-700"
                    title="API Settings"
                    >
                    <Settings className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Ask ${selectedService === 'openai' ? 'GPT-4' : 'Claude'} about the code...`}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                        }
                    }}
                    />
                    <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                    >
                    {loading ? (
                        <span className="animate-pulse">Processing...</span>
                    ) : (
                        <div className="flex items-center justify-center">
                        <Send className="w-4 h-4 mr-2" />
                        Send
                        </div>
                    )}
                    </button>
                </div>
                </div>
            </div>
            </div>
      </div>

      {showSettings && <SettingsModal />}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        message="Opening a new folder will clear the current chat history. Are you sure you want to continue?"
        onConfirm={handleConfirmNewDirectory}
        onCancel={handleCancelNewDirectory}
      />
    </div>
  );
}

export default App;
