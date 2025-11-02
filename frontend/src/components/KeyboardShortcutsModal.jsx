import React from 'react';
import { X, Command } from 'lucide-react';

export const KeyboardShortcutsModal = ({ show, onClose, darkMode }) => {
  if (!show) return null;

  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Focus search bar' },
    { keys: ['⌘', 'N'], description: 'Create new blog' },
    { keys: ['⌘', 'M'], description: 'Add new movie' },
    { keys: ['⌘', 'T'], description: 'Add new TV show' },
    { keys: ['⌘', 'D'], description: 'Toggle dark/light mode' },
    { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['ESC'], description: 'Close any modal' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl shadow-2xl max-w-md w-full p-8 border ${darkMode ? 'border-purple-500/30' : 'border-purple-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
            <Command className="w-6 h-6 text-purple-400" />
            Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className={`p-2 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'} rounded-xl transition-all`}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/20' : 'bg-slate-100 border-purple-200'} rounded-xl border`}>
              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd key={i} className={`px-2 py-1 ${darkMode ? 'bg-slate-800 border-purple-500/30' : 'bg-white border-purple-300'} border rounded text-xs font-mono`}>
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};