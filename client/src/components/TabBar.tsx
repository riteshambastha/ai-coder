import { FC } from 'react';
import { X, Circle } from 'lucide-react';

interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  language: string;
}

interface TabBarProps {
  tabs: EditorTab[];
  activeTab: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

const TabBar: FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
}) => {
  return (
    <div className="flex bg-gray-800 text-white overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center px-4 py-2 cursor-pointer border-r border-gray-700 min-w-[120px] max-w-[200px] group ${
            activeTab === tab.id ? 'bg-gray-700' : 'hover:bg-gray-600'
          }`}
          onClick={() => onTabSelect(tab.id)}
        >
          <div className="flex-1 flex items-center min-w-0">
            <span className="truncate text-sm">{tab.name}</span>
            {tab.isModified && (
              <Circle className="w-2 h-2 ml-2 fill-blue-400 text-blue-400" />
            )}
          </div>
          <button
            className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-gray-500 rounded p-1 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default TabBar;