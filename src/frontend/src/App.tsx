import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout';
import { Dashboard, SpacePage, PageView } from '@/pages';

// Placeholder for auth pages (to be implemented)
const AuthPlaceholder = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
    <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl border border-gray-700">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <h1 className="text-2xl font-bold">foohut.com</h1>
        <p className="text-gray-400 mt-1">{name}</p>
      </div>
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button className="w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors">
          {name === 'Login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  </div>
);

// Settings placeholder
const SettingsPlaceholder = () => (
  <Layout>
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <p className="text-gray-400">Settings page coming soon...</p>
      </div>
    </div>
  </Layout>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // For development: bypass auth check (remove in production)
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<AuthPlaceholder name="Login" />} />
      <Route path="/register" element={<AuthPlaceholder name="Register" />} />

      {/* Protected routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Organization routes */}
      <Route
        path="/:orgSlug"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Collection routes */}
      <Route
        path="/:orgSlug/:collectionSlug"
        element={
          <ProtectedRoute>
            <Layout>
              <SpacePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Space routes */}
      <Route
        path="/:orgSlug/:collectionSlug/:spaceSlug"
        element={
          <ProtectedRoute>
            <Layout>
              <SpacePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Page editor route */}
      <Route
        path="/:orgSlug/:collectionSlug/:spaceSlug/:pagePath"
        element={
          <ProtectedRoute>
            <Layout>
              <PageView />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Settings routes */}
      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <SettingsPlaceholder />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
