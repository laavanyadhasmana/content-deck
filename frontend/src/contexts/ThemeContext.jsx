import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });

  const [soundEnabled, setSoundEnabled] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode);
      return newMode;
    });
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const playSound = (type) => {
    if (!soundEnabled) return;
    const sounds = {
      click: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQA==',
      success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Iz/LVgyIFJHfH8N2QQA=='
    };
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const bgClass = darkMode 
    ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-slate-900';

  const value = {
    darkMode,
    soundEnabled,
    toggleDarkMode,
    toggleSound,
    playSound,
    bgClass
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};