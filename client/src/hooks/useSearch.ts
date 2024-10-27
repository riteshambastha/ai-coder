import { useState, useCallback } from 'react';
import { FileStructure, FileData } from '../types';

export const useSearch = (fileMap: Map<string, FileData>) => {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const searchFiles = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    const results = Array.from(fileMap.entries())
      .filter(([path, data]) => {
        const content = data.content.toLowerCase();
        const filename = path.toLowerCase();
        const searchLower = query.toLowerCase();
        return filename.includes(searchLower) || content.includes(searchLower);
      })
      .map(([path]) => path);

    setSearchResults(results);
  }, [fileMap]);

  return { searchResults, searchQuery, searchFiles };
};