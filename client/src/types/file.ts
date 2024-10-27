// src/types/file.ts
import { FileSystemFileHandle } from './fileSystem';

export interface FileStructure {
    name: string;
    type: 'file' | 'directory';
    path: string;
    children?: FileStructure[];
  }
  
  export interface FileData {
    handle: FileSystemFileHandle;
    content: string;
    language?: string;
  }