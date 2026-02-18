import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/theme.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy load all pages for better performance
const AuthConfirm = lazy(() => import('./pages/AuthConfirm').then(m => ({ default: m.AuthConfirm })))
const PasswordReset = lazy(() => import('./pages/PasswordReset').then(m => ({ default: m.PasswordReset })))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })))
const PaymentCancel = lazy(() => import('./pages/PaymentCancel').then(m => ({ default: m.PaymentCancel })))
const WordCounter = lazy(() => import('./pages/WordCounter').then(m => ({ default: m.WordCounter })))
const AIDetector = lazy(() => import('./pages/AIDetector').then(m => ({ default: m.AIDetector })))
const AIChecker = lazy(() => import('./pages/AIChecker').then(m => ({ default: m.AIChecker })))
const ChatGPTDetector = lazy(() => import('./pages/ChatGPTDetector').then(m => ({ default: m.ChatGPTDetector })))
const Paraphraser = lazy(() => import('./pages/Paraphraser').then(m => ({ default: m.Paraphraser })))
const Summarizer = lazy(() => import('./pages/Summarizer').then(m => ({ default: m.Summarizer })))
const GrammarChecker = lazy(() => import('./pages/GrammarChecker').then(m => ({ default: m.GrammarChecker })))
const CitationGenerator = lazy(() => import('./pages/CitationGenerator').then(m => ({ default: m.CitationGenerator })))
const ReadabilityChecker = lazy(() => import('./pages/ReadabilityChecker').then(m => ({ default: m.ReadabilityChecker })))
const EssayChecker = lazy(() => import('./pages/EssayChecker').then(m => ({ default: m.EssayChecker })))
const TextComparison = lazy(() => import('./pages/TextComparison').then(m => ({ default: m.TextComparison })))
const PlagiarismChecker = lazy(() => import('./pages/PlagiarismChecker').then(m => ({ default: m.PlagiarismChecker })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const GPTZeroAlternative = lazy(() => import('./pages/GPTZeroAlternative').then(m => ({ default: m.GPTZeroAlternative })))

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/auth/reset-password" element={<PasswordReset />} />
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/cancel" element={<PaymentCancel />} />
            {/* SEO Landing Pages - Lazy loaded for performance */}
            <Route path="/word-counter" element={<WordCounter />} />
            <Route path="/ai-detector" element={<AIDetector />} />
            <Route path="/ai-checker" element={<AIChecker />} />
            <Route path="/chatgpt-detector" element={<ChatGPTDetector />} />
            <Route path="/paraphraser" element={<Paraphraser />} />
            <Route path="/summarizer" element={<Summarizer />} />
            <Route path="/grammar-checker" element={<GrammarChecker />} />
            <Route path="/citation-generator" element={<CitationGenerator />} />
            <Route path="/readability-checker" element={<ReadabilityChecker />} />
            <Route path="/essay-checker" element={<EssayChecker />} />
            <Route path="/text-comparison" element={<TextComparison />} />
            <Route path="/plagiarism-checker" element={<PlagiarismChecker />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Competitor Comparison Pages */}
            <Route path="/alternatives/gptzero" element={<GPTZeroAlternative />} />
            <Route path="/gptzero-alternative" element={<GPTZeroAlternative />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
