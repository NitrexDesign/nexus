"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { WidgetProps } from '@/lib/widgets/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface TodoSettings {
  maxItems: number;
  showCompleted: boolean;
}

const TODO_STORAGE_KEY = 'nexus_todo_items';

export function TodoWidget({ config, onUpdateConfig, isEditing }: WidgetProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  const settings = config.settings as TodoSettings;

  // Load todos from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TODO_STORAGE_KEY);
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved todos:', error);
      }
    }
  }, []);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodoText.trim()) return;

    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos(prev => [newTodo, ...prev]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  // Filter and limit todos based on settings
  const displayTodos = todos
    .filter(todo => settings.showCompleted || !todo.completed)
    .slice(0, settings.maxItems);

  const incompleteCount = todos.filter(todo => !todo.completed).length;

  return (
    <BaseWidget
      config={config}
      onUpdateConfig={onUpdateConfig}
      isEditing={isEditing}
      title={`Todo (${incompleteCount})`}
      icon={<CheckSquare className="h-4 w-4" />}
      className="h-full"
    >
      <div className="flex flex-col h-full">
        {/* Add new todo input */}
        <div className="flex gap-1 mb-2">
          <Input
            placeholder="Add a task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-7 text-sm px-2"
          />
          <Button
            size="sm"
            onClick={addTodo}
            disabled={!newTodoText.trim()}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Todo list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {displayTodos.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-2">
              No tasks yet
            </div>
          ) : (
            displayTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-1.5 group py-0.5"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="flex-shrink-0 h-4 w-4"
                />
                <span
                  className={`flex-1 text-sm truncate leading-tight ${
                    todo.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {todo.text}
                </span>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Show more indicator */}
        {todos.length > settings.maxItems && (
          <div className="text-xs text-muted-foreground text-center mt-1">
            +{todos.length - settings.maxItems} more
          </div>
        )}
      </div>
    </BaseWidget>
  );
}

// Settings component for the Todo widget
export function TodoWidgetSettings({ settings, onSettingsChange }: { settings: Record<string, any>; onSettingsChange: (settings: Record<string, any>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Maximum items to show</label>
        <select
          value={settings.maxItems}
          onChange={(e) => onSettingsChange({ ...settings, maxItems: parseInt(e.target.value) })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          <option value={5}>5 items</option>
          <option value={10}>10 items</option>
          <option value={15}>15 items</option>
          <option value={20}>20 items</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showCompleted"
          checked={settings.showCompleted}
          onChange={(e) => onSettingsChange({ ...settings, showCompleted: e.target.checked })}
        />
        <label htmlFor="showCompleted" className="text-sm">Show completed tasks</label>
      </div>
    </div>
  );
}