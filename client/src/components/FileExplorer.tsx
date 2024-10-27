// src/components/FileExplorer.tsx
import { useState } from 'react';
import { FolderOpen, File, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileStructure } from '../types';

interface FileExplorerProps {
  structure: FileStructure[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  onDirectorySelect: () => void;
}

interface FileTreeProps {
  item: FileStructure;
  level?: number;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}

const FileTree: React.FC<FileTreeProps> = ({
  item,
  level = 0,
  onFileSelect,
  selectedFile
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const paddingLeft = `${level * 1.5}rem`;

  if (item.type === 'file') {
    const isSelected = selectedFile === item.path;
    return (
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => onFileSelect(item.path)}
      >
        <File className="w-4 h-4 mr-2 text-gray-500" />
        <span className="text-sm truncate">{item.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100"
        style={{ paddingLeft }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 mr-2 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-2 text-gray-500" />
        )}
        <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
        <span className="text-sm font-medium truncate">{item.name}</span>
      </div>
      {isOpen && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileTree
              key={`${child.path}-${index}`}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  structure,
  onFileSelect,
  selectedFile,
  onDirectorySelect
}) => {
  return (
    <div className="w-64 bg-white border-r overflow-hidden flex flex-col">
      <div className="p-4 border-b">
        <button
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          onClick={onDirectorySelect}
        >
          Open Folder
        </button>
      </div>
      <div className="overflow-auto flex-1 py-2">
        {structure.map((item, index) => (
          <FileTree
            key={`${item.path}-${index}`}
            item={item}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;