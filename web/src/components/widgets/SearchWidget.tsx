"use client";

import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { WidgetProps } from '@/lib/widgets/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchSettings {
  defaultEngine: string;
  showSuggestions: boolean;
}

const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=' },
  { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
  { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?q=' },
];

const POPULAR_SEARCHES = [
  'Weather',
  'News',
  'Maps',
  'YouTube',
  'GitHub',
  'Stack Overflow',
  'Reddit',
];

export function SearchWidget({ config, onUpdateConfig, isEditing }: WidgetProps) {
  const [query, setQuery] = useState('');
  const [selectedEngine, setSelectedEngine] = useState(config.settings.defaultEngine);

  const settings = config.settings as SearchSettings;

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    const engine = SEARCH_ENGINES.find(e => e.id === selectedEngine) || SEARCH_ENGINES[0];
    const searchUrl = engine.url + encodeURIComponent(finalQuery.trim());
    window.open(searchUrl, '_blank');
    setQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <BaseWidget
      config={config}
      onUpdateConfig={onUpdateConfig}
      isEditing={isEditing}
      title="Search"
      icon={<SearchIcon className="h-4 w-4" />}
      className="h-full"
    >
      <div className="flex flex-col h-full space-y-3">
        {/* Search input and engine selector */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search the web..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-9"
            />
          </div>
          <Select value={selectedEngine} onValueChange={setSelectedEngine}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_ENGINES.map(engine => (
                <SelectItem key={engine.id} value={engine.id}>
                  {engine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleSearch()} className="h-9 px-3">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Popular searches */}
        {settings.showSuggestions && (
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-2">Popular searches:</div>
            <div className="flex flex-wrap gap-1">
              {POPULAR_SEARCHES.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="h-6 text-xs px-2 py-0"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}

// Settings component for the Search widget
export function SearchWidgetSettings({ settings, onSettingsChange }: { settings: Record<string, any>; onSettingsChange: (settings: Record<string, any>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Default Search Engine</label>
        <select
          value={settings.defaultEngine}
          onChange={(e) => onSettingsChange({ ...settings, defaultEngine: e.target.value })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          {SEARCH_ENGINES.map(engine => (
            <option key={engine.id} value={engine.id}>{engine.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showSuggestions"
          checked={settings.showSuggestions}
          onChange={(e) => onSettingsChange({ ...settings, showSuggestions: e.target.checked })}
        />
        <label htmlFor="showSuggestions" className="text-sm">Show popular search suggestions</label>
      </div>
    </div>
  );
}