import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  searchResults?: string[];
  onResultSelect?: (path: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClose,
  searchResults = [],
  onResultSelect
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      onResultSelect?.(searchResults[selectedIndex]);
      onClose();
    }
  };

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center bg-gray-700 p-2">
        <Search size={16} className="text-gray-400 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none text-white outline-none"
          placeholder="Search files..."
        />
        <button onClick={onClose}>
          <X size={16} className="text-gray-400" />
        </button>
      </div>
      {searchResults.length > 0 && (
        <div className="max-h-64 overflow-y-auto bg-gray-800">
          {searchResults.map((result, index) => (
            <div
              key={result}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
              onClick={() => {
                onResultSelect?.(result);
                onClose();
              }}
            >
              <span className="text-white text-sm">{result}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;