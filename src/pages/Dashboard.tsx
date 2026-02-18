import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Analysis {
  id: string;
  user_id: string;
  tool_type: string;
  text_preview: string;
  result_score: number | null;
  result_summary: string;
  created_at: string;
  word_count: number;
  processing_time: number;
}

interface User {
  email: string;
  subscription_tier: string;
  token_balance: number;
  created_at: string;
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ai-detector' | 'grammar' | 'plagiarism' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'tool'>('date');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/');
        return;
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, subscription_tier, token_balance, created_at')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Get analysis history
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (analysisError) throw analysisError;
      setAnalyses(analysisData || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getToolIcon = (toolType: string) => {
    const icons: Record<string, string> = {
      'ai-detector': '🤖',
      'grammar': '✓',
      'plagiarism': '🔍',
      'paraphrase': '✏️',
      'summarize': '📝',
      'word-count': '🔢',
      'readability': '📖',
      'citation': '📚',
      'essay': '📄',
      'comparison': '⚖️'
    };
    return icons[toolType] || '📊';
  };

  const getToolName = (toolType: string) => {
    const names: Record<string, string> = {
      'ai-detector': 'AI Detector',
      'grammar': 'Grammar Checker',
      'plagiarism': 'Plagiarism Checker',
      'paraphrase': 'Paraphraser',
      'summarize': 'Summarizer',
      'word-count': 'Word Counter',
      'readability': 'Readability',
      'citation': 'Citation Generator',
      'essay': 'Essay Checker',
      'comparison': 'Text Comparison'
    };
    return names[toolType] || toolType;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score < 30) return 'text-green-500';
    if (score < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredAnalyses = analyses
    .filter(a => {
      if (filter === 'all') return true;
      if (filter === 'other') return !['ai-detector', 'grammar', 'plagiarism'].includes(a.tool_type);
      return a.tool_type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'score') {
        return (b.result_score || 0) - (a.result_score || 0);
      }
      return a.tool_type.localeCompare(b.tool_type);
    });

  const stats = {
    totalAnalyses: analyses.length,
    thisWeek: analyses.filter(a => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(a.created_at) > weekAgo;
    }).length,
    avgScore: analyses.filter(a => a.result_score !== null).length > 0
      ? Math.round(
          analyses
            .filter(a => a.result_score !== null)
            .reduce((sum, a) => sum + (a.result_score || 0), 0) /
          analyses.filter(a => a.result_score !== null).length
        )
      : null,
    totalWords: analyses.reduce((sum, a) => sum + (a.word_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={theme === 'dark'
                  ? "/High-Resolution-Color-Logo-on-Transparent-Background-DARK.svg"
                  : "/High-Resolution-Color-Logo-on-Transparent-Background.svg"
                }
                alt="OriginLytics Logo"
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.email} • {user?.subscription_tier.charAt(0).toUpperCase()}{user?.subscription_tier.slice(1)} Plan
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Token Balance</div>
            <div className="text-3xl font-bold text-blue-500">{user?.token_balance || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Analyses</div>
            <div className="text-3xl font-bold">{stats.totalAnalyses}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</div>
            <div className="text-3xl font-bold">{stats.thisWeek}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Words Analyzed</div>
            <div className="text-3xl font-bold">{stats.totalWords.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="all">All Tools</option>
                <option value="ai-detector">AI Detector</option>
                <option value="grammar">Grammar Checker</option>
                <option value="plagiarism">Plagiarism Checker</option>
                <option value="other">Other Tools</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="tool">Tool Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Analysis History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold">Analysis History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredAnalyses.length} {filteredAnalyses.length === 1 ? 'result' : 'results'}
            </p>
          </div>

          {filteredAnalyses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">No analyses yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start analyzing your content with our AI-powered tools
              </p>
              <Link
                to="/ai-detector"
                className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Try AI Detector
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getToolIcon(analysis.tool_type)}</span>
                        <div>
                          <h3 className="font-semibold">{getToolName(analysis.tool_type)}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(analysis.created_at)} • {analysis.word_count} words • {(analysis.processing_time / 1000).toFixed(1)}s
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                        {analysis.text_preview}
                      </p>
                      {analysis.result_summary && (
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {analysis.result_summary}
                          </p>
                        </div>
                      )}
                    </div>
                    {analysis.result_score !== null && (
                      <div className="ml-4 text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.result_score)}`}>
                          {analysis.result_score}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          AI Score
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              to="/ai-detector"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-sm font-semibold">AI Detector</div>
            </Link>
            <Link
              to="/grammar-checker"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">✓</div>
              <div className="text-sm font-semibold">Grammar</div>
            </Link>
            <Link
              to="/plagiarism-checker"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm font-semibold">Plagiarism</div>
            </Link>
            <Link
              to="/paraphraser"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="text-sm font-semibold">Paraphrase</div>
            </Link>
            <Link
              to="/essay-checker"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm font-semibold">Essay</div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
