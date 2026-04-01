import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MediaLibrary } from './pages/MediaLibrary';
import { Pages } from './pages/Pages';
import PageEditor from './pages/PageEditor';
import { AdminLayout } from './components/layout/AdminLayout';
import ThemeSettings from './pages/ThemeSettings';
import TemplateEditor from './pages/TemplateEditor';
import { Posts } from './pages/Posts';
import PostEditor from './pages/PostEditor';
import { Categories } from './pages/Categories';
import { Tags } from './pages/Tags';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('token');
  const isAuthenticated = token && token !== 'null' && token !== 'undefined';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  return (
    <Router>
      {/* Toaster Global - Notificaciones Toast */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #333',
            fontFamily: 'monospace',
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: {
              primary: '#C2F86C',
              secondary: '#141414',
            },
            style: {
              border: '1px solid rgba(194, 248, 108, 0.3)',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#141414',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }
          }
        }}
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/media"
          element={
            <ProtectedRoute>
              <MediaLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/design-system"
          element={
            <ProtectedRoute>
              <ThemeSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/templates"
          element={
            <ProtectedRoute>
              <TemplateEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pages"
          element={
            <ProtectedRoute>
              <Pages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pages/new"
          element={
            <ProtectedRoute>
              <PageEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pages/edit/:id"
          element={
            <ProtectedRoute>
              <PageEditor />
            </ProtectedRoute>
          }
        />

        {/* Blog Routes */}
        <Route
          path="/dashboard/posts"
          element={
            <ProtectedRoute>
              <Posts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/posts/new"
          element={
            <ProtectedRoute>
              <PostEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/posts/edit/:id"
          element={
            <ProtectedRoute>
              <PostEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tags"
          element={
            <ProtectedRoute>
              <Tags />
            </ProtectedRoute>
          }
        />
        {/* Redirect any unknown route to dashboard (which will redirect to login if not authenticated) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </Router>
  );
}

export default App;