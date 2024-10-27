// src/components/CodeEditor.tsx
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useMonaco } from '../hooks/useMonaco';

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  language,
  onChange,
  readOnly = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  useMonaco();

  useEffect(() => {
    if (editorRef.current) {
      editorInstance.current = monaco.editor.create(editorRef.current, {
        value: content,
        language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        readOnly,
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        rulers: [80],
        bracketPairColorization: { enabled: true },
        renderWhitespace: 'selection',
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        wordWrap: 'on',
        padding: { top: 10 },
        folding: true,
        foldingStrategy: 'indentation',
        renderLineHighlight: 'all',
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        },
        find: {
          addExtraSpaceOnTop: false,
        },
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true
        },
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        dragAndDrop: true,
        links: true,
        mouseWheelZoom: true
      });

      editorInstance.current.onDidChangeModelContent(() => {
        onChange(editorInstance.current?.getValue() || '');
      });

      // Add custom keybindings
      editorInstance.current.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          // Trigger save event
          const event = new CustomEvent('editor-save');
          window.dispatchEvent(event);
        }
      );

      return () => {
        editorInstance.current?.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (editorInstance.current) {
      if (editorInstance.current.getValue() !== content) {
        editorInstance.current.setValue(content);
      }
      monaco.editor.setModelLanguage(
        editorInstance.current.getModel()!,
        language
      );
    }
  }, [content, language]);

  return <div ref={editorRef} className="h-full w-full" />;
};

export default CodeEditor;