import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Eye, EyeOff, Edit2, Trash2, Film, Tv, BookOpen, User, Home, X, LogOut, Star, Calendar, Tag, Moon, Sun, Volume2, VolumeX, Sparkles, Command } from 'lucide-react';

// ADD THESE NEW IMPORTS
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { useToast } from './contexts/ToastContext';
import { api } from './services/api';
import { useDebounce } from './hooks/useDebounce';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { Confetti } from './components/Confetti';
import { ParticleBackground } from './components/ParticleBackground';



function App() {
  const { user: currentUser, isAuthenticated, loading: authLoading, login, logout, setLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { darkMode, soundEnabled, toggleDarkMode, toggleSound, playSound, bgClass } = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Add these new filter states
  const [blogFilters, setBlogFilters] = useState({ sortBy: 'newest', search: '', tag: '' });
  const [movieFilters, setMovieFilters] = useState({ sortBy: 'newest', minRating: 1, year: '' });
  const [tvFilters, setTvFilters] = useState({ sortBy: 'newest', minRating: 1, year: '' });

  const [blogs, setBlogs] = useState([]);
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);

  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', name: '' });
  const [formData, setFormData] = useState({ title: '', content: '', year: '', rating: 5, notes: '', tags: '', isPublic: true });

  const searchInputRef = useRef(null);

  // Memoized filtered content
// Replace your existing filteredBlogs
const filteredBlogs = useMemo(() => {
  let filtered = blogs;
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply blog-specific search
  if (blogFilters.search) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(blogFilters.search.toLowerCase()) ||
      b.content?.toLowerCase().includes(blogFilters.search.toLowerCase())
    );
  }
  
  // Apply tag filter
  if (blogFilters.tag) {
    filtered = filtered.filter(b => b.tags?.includes(blogFilters.tag));
  }
  
  // Apply sorting
  switch(blogFilters.sortBy) {
    case 'oldest':
      return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'title':
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    default: // newest
      return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}, [blogs, searchQuery, blogFilters]);

// Replace your existing filteredMovies
const filteredMovies = useMemo(() => {
  let filtered = movies;
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply rating filter
  if (movieFilters.minRating > 1) {
    filtered = filtered.filter(m => m.rating >= movieFilters.minRating);
  }
  
  // Apply year filter
  if (movieFilters.year) {
    filtered = filtered.filter(m => m.year === parseInt(movieFilters.year));
  }
  
  // Apply sorting
  switch(movieFilters.sortBy) {
    case 'oldest':
      return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'rating':
      return [...filtered].sort((a, b) => b.rating - a.rating);
    case 'year':
      return [...filtered].sort((a, b) => b.year - a.year);
    case 'title':
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    default: // newest
      return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}, [movies, searchQuery, movieFilters]);

// Replace your existing filteredTvShows
const filteredTvShows = useMemo(() => {
  let filtered = tvShows;
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply rating filter
  if (tvFilters.minRating > 1) {
    filtered = filtered.filter(t => t.rating >= tvFilters.minRating);
  }
  
  // Apply year filter
  if (tvFilters.year) {
    filtered = filtered.filter(t => t.year === parseInt(tvFilters.year));
  }
  
  // Apply sorting
  switch(tvFilters.sortBy) {
    case 'oldest':
      return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'rating':
      return [...filtered].sort((a, b) => b.rating - a.rating);
    case 'year':
      return [...filtered].sort((a, b) => b.year - a.year);
    case 'title':
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    default: // newest
      return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}, [tvShows, searchQuery, tvFilters]);

  // Debounced search
  const debouncedSearch = useDebounce((value) => {
    setSearchQuery(value);
  }, 300);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const { showToast } = useToast();

  const changeTab = (tab) => {
    playSound('click');
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 200);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'n':
            e.preventDefault();
            if (isAuthenticated) openModal('blog');
            break;
          case 'm':
            e.preventDefault();
            if (isAuthenticated) openModal('movie');
            break;
          case 't':
            e.preventDefault();
            if (isAuthenticated) openModal('tv');
            break;
          case 'd':
            e.preventDefault();
            toggleDarkMode();
            break;
          case '/':
            e.preventDefault();
            setShowShortcuts(true);
            break;
          default:
            break;
        }
      } else if (e.key === 'Escape') {
        if (showModal) closeModal();
        if (showShortcuts) setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showModal, showShortcuts, isAuthenticated]);

  useEffect(() => {
    const token = localStorage.getItem('token');    
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
      setShowAuthModal(true);
    }
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await api.getCurrentUser();
login(userData, localStorage.getItem('token'));
      await loadContent();
    } catch (err) {
      localStorage.removeItem('token');
      setShowAuthModal(true);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      const [blogsData, moviesData, tvData] = await Promise.all([
        api.call('/blogs'),
        api.call('/movies'),
        api.call('/tvshows')
      ]);
      setBlogs(blogsData.map(b => ({ ...b, isPublic: b.is_public, createdAt: b.created_at })));
      setMovies(moviesData.map(m => ({ ...m, isPublic: m.is_public })));
      setTvShows(tvData.map(t => ({ ...t, isPublic: t.is_public })));
    } catch (err) {
      showToast('Failed to load content', 'error');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = authMode === 'login' 
  ? await api.login({ username: authForm.username, password: authForm.password })
  : await api.register(authForm);

if (result.token) {
  login(result.user, result.token);
  setShowAuthModal(false);
        playSound('success');
        setShowConfetti(true);
        showToast(`Welcome ${authMode === 'login' ? 'back' : 'to ContentDeck'}, ${result.user.name}!`, 'success');
        await loadContent();
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    playSound('click');
    logout();
setBlogs([]);
setMovies([]);
setTvShows([]);
setShowAuthModal(true);
    showToast('Logged out successfully', 'success');
  };

  const openModal = (type, item = null) => {
    playSound('click');
    setModalType(type);
    setEditingItem(item);
    if (item) {
      setFormData({
        title: item.title || '', content: item.content || '', year: item.year || '',
        rating: item.rating || 5, notes: item.notes || '', tags: item.tags?.join(', ') || '', isPublic: item.isPublic
      });
    } else {
      setFormData({ title: '', content: '', year: '', rating: 5, notes: '', tags: '', isPublic: true });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    playSound('click');
    setShowModal(false);
    setEditingItem(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const endpoint = modalType === 'blog' ? '/blogs' : modalType === 'movie' ? '/movies' : '/tvshows';
      const data = modalType === 'blog' 
        ? { title: formData.title, content: formData.content, tags: formData.tags.split(',').map(t => t.trim()).filter(t => t), is_public: formData.isPublic }
        : { title: formData.title, year: parseInt(formData.year), rating: formData.rating, notes: formData.notes, is_public: formData.isPublic };
      
      if (editingItem) {
        await api.call(`${endpoint}/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Updated successfully!', 'success');
      } else {
        await api.call(endpoint, { method: 'POST', body: JSON.stringify(data) });
        playSound('success');
        setShowConfetti(true);
        showToast('Created successfully!', 'success');
      }
      await loadContent();
      closeModal();
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm('Delete this item?')) return;
    playSound('click');
    try {
      const endpoint = type === 'blog' ? '/blogs' : type === 'movie' ? '/movies' : '/tvshows';
      await api.call(`${endpoint}/${id}`, { method: 'DELETE' });
      await loadContent();
      showToast('Deleted successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleVisibility = async (type, id, item) => {
    playSound('click');
    try {
      const endpoint = type === 'blog' ? '/blogs' : type === 'movie' ? '/movies' : '/tvshows';
      await api.call(`${endpoint}/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ ...item, is_public: !item.isPublic }) 
      });
      await loadContent();
      showToast(`Made ${!item.isPublic ? 'public' : 'private'}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-pink-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-400 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-500`}>
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <ParticleBackground />
      <KeyboardShortcutsModal show={showShortcuts} onClose={() => setShowShortcuts(false)} darkMode={darkMode} />
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl shadow-2xl max-w-md w-full p-8 border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'} backdrop-blur-xl transform transition-all duration-300 hover:scale-105`}>
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/50 animate-bounce">
                <Film className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {authMode === 'login' ? 'Welcome Back' : 'Join the Hub'}
              </h2>
              <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>Your cinematic journey awaits</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm backdrop-blur-sm animate-shake">
                {error}
              </div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <input type="text" placeholder="Full Name" required value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-800/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all backdrop-blur-sm`}
                  />
                  <input type="email" placeholder="Email" required value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-800/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all backdrop-blur-sm`}
                  />
                </>
              )}
              <input type="text" placeholder="Username" required value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-800/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all backdrop-blur-sm`}
              />
              <input type="password" placeholder="Password" required value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-800/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all backdrop-blur-sm`}
              />
              <button type="submit" disabled={isSubmitting} 
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg shadow-purple-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {authMode === 'login' ? 'Logging in...' : 'Creating account...'}
                  </span>
                ) : (
                  authMode === 'login' ? 'Enter the Hub' : 'Create Account'
                )}
              </button>
            </form>
            
            <p className={`mt-6 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); playSound('click'); }}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                {authMode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      )}

      {isAuthenticated && currentUser && (
        <>
          {/* Header */}
          <header className={`relative ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl border-b ${darkMode ? 'border-purple-500/20' : 'border-purple-200'} sticky top-0 z-40 shadow-lg ${darkMode ? 'shadow-purple-500/10' : 'shadow-purple-200/50'}`}>
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-500/50 animate-pulse">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    ContentDeck
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search your universe..." 
                      value={searchInput}
                      onChange={handleSearchChange}
                      className={`pl-10 pr-4 py-2 ${darkMode ? 'bg-slate-800/50 border-purple-500/30' : 'bg-white border-purple-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 w-64 placeholder-slate-500 backdrop-blur-sm transition-all group-hover:border-purple-500/50`}
                    />
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowShortcuts(true)}
                      className={`p-2 ${darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-100'} rounded-xl transition-all border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}
                      title="Keyboard Shortcuts (⌘/)">
                      <Command className="w-4 h-4 text-purple-400" />
                    </button>
                    <button onClick={toggleSound}
                      className={`p-2 ${darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-100'} rounded-xl transition-all border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}>
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    </button>
                    <button onClick={toggleDarkMode}
                      className={`p-2 ${darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-100'} rounded-xl transition-all border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}>
                      {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
                    </button>
                  </div>

                  <div className={`flex items-center gap-3 px-4 py-2 ${darkMode ? 'bg-slate-800/50' : 'bg-white'} rounded-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'} backdrop-blur-sm`}>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{currentUser.username}</span>
                    <button onClick={handleLogout} className={`p-2 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'} rounded-lg transition-all`}>
                      <LogOut className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className={`relative ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'} backdrop-blur-xl border-b ${darkMode ? 'border-purple-500/10' : 'border-purple-200'}`}>
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-2">
                {[
                  { id: 'home', label: 'Home', icon: Home, gradient: 'from-purple-600 to-pink-600' },
                  { id: 'blogs', label: `Blogs (${blogs.length})`, icon: BookOpen, gradient: 'from-blue-600 to-cyan-600' },
                  { id: 'movies', label: `Movies (${movies.length})`, icon: Film, gradient: 'from-pink-600 to-rose-600' },
                  { id: 'tv', label: `TV Shows (${tvShows.length})`, icon: Tv, gradient: 'from-green-600 to-emerald-600' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => changeTab(tab.id)}
                    className={`px-6 py-4 font-medium text-sm transition-all relative group ${
                      activeTab === tab.id 
                        ? darkMode ? 'text-white' : 'text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}>
                    <div className="flex items-center gap-2 relative z-10">
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </div>
                    {activeTab === tab.id && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20 rounded-xl`}></div>
                    )}
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tab.gradient} transition-all ${
                      activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                    }`}></div>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Main Content with Page Transition */}
          <main className={`relative max-w-7xl mx-auto px-4 py-8 transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {activeTab === 'home' && (
              <div className="space-y-8 animate-fadeIn">
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${darkMode ? 'from-purple-900/50 to-pink-900/50' : 'from-purple-100/80 to-pink-100/80'} p-8 backdrop-blur-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-300'} shadow-2xl`}>
                  <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                      Welcome back, {currentUser.name}!
                    </h2>
                    <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-lg`}>Your creative universe at a glance</p>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { count: blogs.length, label: 'Blog Posts', icon: BookOpen, gradient: 'from-blue-600 to-cyan-600' },
                    { count: movies.length, label: 'Movies', icon: Film, gradient: 'from-pink-600 to-rose-600' },
                    { count: tvShows.length, label: 'TV Shows', icon: Tv, gradient: 'from-green-600 to-emerald-600' },
                  ].map((stat, idx) => (
                    <div key={idx} 
                      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-xl border ${darkMode ? 'border-purple-500/20 hover:border-purple-500/50' : 'border-purple-200 hover:border-purple-300'} p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${darkMode ? 'hover:shadow-purple-500/20' : 'hover:shadow-purple-300/50'} cursor-pointer`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                          <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-right">
                          <p className={`text-4xl font-bold ${darkMode ? 'bg-gradient-to-r from-white to-slate-300' : 'bg-gradient-to-r from-slate-800 to-slate-600'} bg-clip-text text-transparent`}>
                            {stat.count}
                          </p>
                        </div>
                      </div>
                      <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} font-medium`}>{stat.label}</p>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}></div>
                    </div>
                  ))}
                </div>

                {blogs.length > 0 && (
                  <div className={`rounded-2xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'} p-6`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {blogs.slice(0, 3).map(blog => (
                        <div key={blog.id} className={`flex items-center gap-4 p-4 ${darkMode ? 'bg-slate-900/50 border-purple-500/10 hover:border-purple-500/30' : 'bg-slate-50 border-purple-200 hover:border-purple-300'} rounded-xl border transition-all group cursor-pointer`}>
                          <BookOpen className={`w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform`} />
                          <span className={`flex-1 ${darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}>{blog.title}</span>
                          {blog.isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'blogs' && (
              <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    My Blogs
                  </h2>
                  {/* Filter Controls for Blogs */}
<div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}>
  <div className="flex flex-wrap gap-4">
    <div className="flex-1 min-w-[200px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sort By</label>
      <select 
        value={blogFilters.sortBy}
        onChange={(e) => setBlogFilters({...blogFilters, sortBy: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="title">Alphabetical</option>
      </select>
    </div>
    <div className="flex-1 min-w-[200px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Search in Blogs</label>
      <input 
        type="text"
        placeholder="Search title or content..."
        value={blogFilters.search}
        onChange={(e) => setBlogFilters({...blogFilters, search: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500`}
      />
    </div>
    <div className="flex items-end">
      <button 
        onClick={() => setBlogFilters({ sortBy: 'newest', search: '', tag: '' })}
        className={`px-6 py-2 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200 hover:bg-slate-300'} rounded-xl transition-all`}>
        Clear Filters
      </button>
    </div>
  </div>
</div>
                  <button onClick={() => openModal('blog')} 
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/50 transform hover:scale-105 font-semibold">
                    <Plus className="w-5 h-5" />
                    New Blog
                  </button>
                </div>
                <div className="space-y-6">
                  {filteredBlogs.map((blog, idx) => (
                    <div key={blog.id} 
                      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-slate-800/50 border-purple-500/20 hover:border-blue-500/50 hover:shadow-blue-500/20' : 'bg-white/80 border-purple-200 hover:border-blue-400 hover:shadow-blue-300/50'} backdrop-blur-xl border p-6 transition-all duration-300 hover:shadow-2xl`}
                      style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <h3 className={`text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {blog.title}
                          </h3>
                          <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 leading-relaxed`}>{blog.content}</p>
                          {blog.tags && blog.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {blog.tags.map(tag => (
                                <span key={tag} className={`px-3 py-1 ${darkMode ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-700'} border rounded-full text-xs flex items-center gap-1`}>
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-6">
                          <button onClick={() => toggleVisibility('blog', blog.id, blog)} 
                            className={`p-3 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50 border-purple-500/20 hover:border-green-500/50' : 'bg-white hover:bg-slate-50 border-purple-200 hover:border-green-400'} rounded-xl transition-all border group/btn`}>
                            {blog.isPublic ? 
                              <Eye className="w-5 h-5 text-green-400 group-hover/btn:scale-110 transition-transform" /> : 
                              <EyeOff className="w-5 h-5 text-slate-500 group-hover/btn:scale-110 transition-transform" />
                            }
                          </button>
                          <button onClick={() => openModal('blog', blog)} 
                            className={`p-3 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50 border-purple-500/20 hover:border-blue-500/50' : 'bg-white hover:bg-slate-50 border-purple-200 hover:border-blue-400'} rounded-xl transition-all border group/btn`}>
                            <Edit2 className="w-5 h-5 text-blue-400 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button onClick={() => deleteItem('blog', blog.id)} 
                            className={`p-3 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50 border-purple-500/20 hover:border-red-500/50' : 'bg-white hover:bg-slate-50 border-purple-200 hover:border-red-400'} rounded-xl transition-all border group/btn`}>
                            <Trash2 className="w-5 h-5 text-red-400 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}></div>
                    </div>
                  ))}
                  {filteredBlogs.length === 0 && (
                    <div className="text-center py-20">
                      <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-pulse" />
                      <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-lg mb-4`}>
                        {searchQuery ? 'No blogs found matching your search' : 'No blogs yet. Create your first masterpiece!'}
                      </p>
                      {!searchQuery && (
                        <button onClick={() => openModal('blog')} 
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg transform hover:scale-105 font-semibold">
                          Create Your First Blog
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'movies' && (
              <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                    My Movies
                  </h2>
                  {/* Filter Controls for Movies */}
<div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}>
  <div className="flex flex-wrap gap-4">
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sort By</label>
      <select 
        value={movieFilters.sortBy}
        onChange={(e) => setMovieFilters({...movieFilters, sortBy: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="rating">Highest Rating</option>
        <option value="year">Year</option>
        <option value="title">Alphabetical</option>
      </select>
    </div>
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Min Rating</label>
      <select 
        value={movieFilters.minRating}
        onChange={(e) => setMovieFilters({...movieFilters, minRating: parseInt(e.target.value)})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}>
        <option value="1">1+ Stars</option>
        <option value="2">2+ Stars</option>
        <option value="3">3+ Stars</option>
        <option value="4">4+ Stars</option>
        <option value="5">5 Stars</option>
      </select>
    </div>
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Year</label>
      <input 
        type="number"
        placeholder="2024"
        value={movieFilters.year}
        onChange={(e) => setMovieFilters({...movieFilters, year: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500`}
      />
    </div>
    <div className="flex items-end">
      <button 
        onClick={() => setMovieFilters({ sortBy: 'newest', minRating: 1, year: '' })}
        className={`px-6 py-2 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200 hover:bg-slate-300'} rounded-xl transition-all`}>
        Clear
      </button>
    </div>
  </div>
</div>
                  <button onClick={() => openModal('movie')} 
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg shadow-pink-500/50 transform hover:scale-105 font-semibold">
                    <Plus className="w-5 h-5" />
                    Add Movie
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMovies.map((movie, idx) => (
                    <div key={movie.id} 
                      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-slate-800/50 border-purple-500/20 hover:border-pink-500/50 hover:shadow-pink-500/20' : 'bg-white/80 border-purple-200 hover:border-pink-400 hover:shadow-pink-300/50'} backdrop-blur-xl border p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                      style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-1 group-hover:text-pink-400 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {movie.title}
                          </h3>
                          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm flex items-center gap-1`}>
                            <Calendar className="w-3 h-3" />
                            {movie.year}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => toggleVisibility('movie', movie.id, movie)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            {movie.isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                          </button>
                          <button onClick={() => openModal('movie', movie)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            <Edit2 className="w-4 h-4 text-pink-400" />
                          </button>
                          <button onClick={() => deleteItem('movie', movie.id)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < movie.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} transition-all group-hover:scale-110`} 
                            style={{ transitionDelay: `${i * 50}ms` }} />
                        ))}
                      </div>
                      <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm leading-relaxed`}>{movie.notes}</p>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    </div>
                  ))}
                  {filteredMovies.length === 0 && (
                    <div className="col-span-full text-center py-20">
                      <Film className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-pulse" />
                      <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-lg mb-4`}>
                        {searchQuery ? 'No movies found matching your search' : 'No movies yet. Start your collection!'}
                      </p>
                      {!searchQuery && (
                        <button onClick={() => openModal('movie')} 
                          className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg transform hover:scale-105 font-semibold">
                          Add Your First Movie
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tv' && (
              <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    My TV Shows
                  </h2>
                  {/* Filter Controls for TV Shows */}
<div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-xl border ${darkMode ? 'border-purple-500/20' : 'border-purple-200'}`}>
  <div className="flex flex-wrap gap-4">
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sort By</label>
      <select 
        value={tvFilters.sortBy}
        onChange={(e) => setTvFilters({...tvFilters, sortBy: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="rating">Highest Rating</option>
        <option value="year">Year</option>
        <option value="title">Alphabetical</option>
      </select>
    </div>
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Min Rating</label>
      <select 
        value={tvFilters.minRating}
        onChange={(e) => setTvFilters({...tvFilters, minRating: parseInt(e.target.value)})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}>
        <option value="1">1+ Stars</option>
        <option value="2">2+ Stars</option>
        <option value="3">3+ Stars</option>
        <option value="4">4+ Stars</option>
        <option value="5">5 Stars</option>
      </select>
    </div>
    <div className="flex-1 min-w-[150px]">
      <label className={`block text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Year</label>
      <input 
        type="number"
        placeholder="2024"
        value={tvFilters.year}
        onChange={(e) => setTvFilters({...tvFilters, year: e.target.value})}
        className={`w-full px-4 py-2 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500`}
      />
    </div>
    <div className="flex items-end">
      <button 
        onClick={() => setTvFilters({ sortBy: 'newest', minRating: 1, year: '' })}
        className={`px-6 py-2 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200 hover:bg-slate-300'} rounded-xl transition-all`}>
        Clear
      </button>
    </div>
  </div>
</div>
                  <button onClick={() => openModal('tv')} 
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/50 transform hover:scale-105 font-semibold">
                    <Plus className="w-5 h-5" />
                    Add TV Show
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTvShows.map((show, idx) => (
                    <div key={show.id} 
                      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-slate-800/50 border-purple-500/20 hover:border-green-500/50 hover:shadow-green-500/20' : 'bg-white/80 border-purple-200 hover:border-green-400 hover:shadow-green-300/50'} backdrop-blur-xl border p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                      style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-1 group-hover:text-green-400 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {show.title}
                          </h3>
                          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm flex items-center gap-1`}>
                            <Calendar className="w-3 h-3" />
                            {show.year}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => toggleVisibility('tv', show.id, show)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            {show.isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                          </button>
                          <button onClick={() => openModal('tv', show)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            <Edit2 className="w-4 h-4 text-green-400" />
                          </button>
                          <button onClick={() => deleteItem('tv', show.id)} 
                            className={`p-2 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50'} rounded-lg transition-all`}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < show.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} transition-all group-hover:scale-110`} 
                            style={{ transitionDelay: `${i * 50}ms` }} />
                        ))}
                      </div>
                      <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm leading-relaxed`}>{show.notes}</p>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    </div>
                  ))}
                  {filteredTvShows.length === 0 && (
                    <div className="col-span-full text-center py-20">
                      <Tv className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-pulse" />
                      <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-lg mb-4`}>
                        {searchQuery ? 'No TV shows found matching your search' : 'No TV shows yet. Start binging!'}
                      </p>
                      {!searchQuery && (
                        <button onClick={() => openModal('tv')} 
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg transform hover:scale-105 font-semibold">
                          Add Your First TV Show
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-50'} rounded-2xl shadow-2xl max-w-2xl w-full p-8 border ${darkMode ? 'border-purple-500/30' : 'border-purple-200'} backdrop-blur-xl transform transition-all duration-300 scale-100 hover:scale-[1.02]`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                {editingItem ? 'Edit' : 'Create'} {modalType === 'blog' ? 'Blog Post' : modalType === 'movie' ? 'Movie' : 'TV Show'}
              </h3>
              <button onClick={closeModal} className={`p-2 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'} rounded-xl transition-all group`}>
                <X className={`w-6 h-6 ${darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'} group-hover:rotate-90 transition-all`} />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm backdrop-blur-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Title</label>
                <input type="text" placeholder="Enter title..." required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all`}
                />
              </div>
              {modalType === 'blog' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Content</label>
                    <textarea placeholder="Write your story..." required value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows="6"
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all resize-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Tags</label>
                    <input type="text" placeholder="tech, travel, life..." value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all`}
                    />
                  </div>
                </>
              )}
              {(modalType === 'movie' || modalType === 'tv') && (
                <>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Year</label>
                    <input type="number" placeholder="2024" required value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Rating: {formData.rating}/5</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max="5" value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${formData.rating * 20}%, rgb(51, 65, 85) ${formData.rating * 20}%, rgb(51, 65, 85) 100%)`
                        }}
                      />
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} transition-all`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Notes</label>
                    <textarea placeholder="Your thoughts..." value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="3"
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-slate-900/50 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all resize-none`}
                    />
                  </div>
                </>
              )}
              <div className={`flex items-center gap-3 p-4 ${darkMode ? 'bg-slate-900/50 border-purple-500/20' : 'bg-slate-100 border-purple-200'} rounded-xl border`}>
                <input type="checkbox" id="isPublic" checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className={`w-5 h-5 rounded ${darkMode ? 'border-purple-500/30 bg-slate-700' : 'border-purple-300 bg-white'} text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 cursor-pointer`}
                />
                <label htmlFor="isPublic" className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} font-medium cursor-pointer flex items-center gap-2`}>
                  {formData.isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                  Make this public
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg shadow-purple-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingItem ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingItem ? 'Update' : 'Create'
                  )}
                </button>
                <button type="button" onClick={closeModal} 
                  className={`px-6 py-3 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200 hover:bg-slate-300'} rounded-xl transition-all font-semibold`}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
        .animate-confetti {
          animation: confetti ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;