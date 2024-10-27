import { 
    FileStructure, 
    FileData, 
    FileSystemFileHandle, 
    FileSystemDirectoryHandle 
  } from '../types/index';
  
  export const readFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      return '';
    }
  };
  
  export const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'rb': 'ruby',
    };
    return languageMap[extension || ''] || 'plaintext';
  };
  
  export const readDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    path = '',
    fileMap: Map<string, FileData>
  ): Promise<FileStructure> => {
    const entries: FileStructure[] = [];
  
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        const subDir = await readDirectory(
          await dirHandle.getDirectoryHandle(entry.name),
          `${path}/${entry.name}`,
          fileMap
        );
        entries.push(subDir);
      } else if (entry.kind === 'file') {
        const filePath = `${path}/${entry.name}`;
        const fileHandle = await dirHandle.getFileHandle(entry.name);
        const content = await readFileContent(fileHandle);
        fileMap.set(filePath, {
          handle: fileHandle,
          content,
          language: detectLanguage(entry.name)
        });
        
        entries.push({
          name: entry.name,
          type: 'file',
          path: filePath
        });
      }
    }
  
    return {
      name: dirHandle.name,
      type: 'directory',
      path,
      children: entries.sort((a, b) => {
        // Directories come first, then files
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      })
    };
  };
  