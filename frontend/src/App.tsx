import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import DashboardLayout from './components/common/Layout/DashboardLayout';
import './styles/globals.css';
import RecordVideo from './pages/courses/RecordVideo';
import MyCourses from './pages/courses/MyCourses';
import CreateCourse from './pages/courses/CreateCourse';
import CourseDetails from './pages/courses/CourseDetails';
import AIAssistant from './pages/ai/AIAssistant';
import FloatingAIChat from './components/ai/FloatingAIChat';
import { AuthProvider, useAuth } from './context/AuthContext';
import Forums from './pages/social/Forums';
import ForumTopics from './pages/social/ForumTopics';
import Achievements from './pages/social/Achievements';
import Leaderboards from './pages/social/Leaderboards';
import CommunityHub from './pages/social/CommunityHub';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ContentManagement from './pages/admin/ContentManagement';
import { UserProvider } from './context/UserContext';
import { OnboardingProvider } from './context/OnboardingContext';
import ContentManager from './components/admin/ContentManager';
import ModerationTools from './components/admin/ModerationTools';
import AnalyticsDashboard from './components/admin/AnalyticsDashboard';
import TagManager from './components/admin/TagManager';
import Header from './components/common/Layout/Header';
import Sidebar from './components/common/Layout/Sidebar';
import ResourceLibrary from './pages/resources/ResourceLibrary';
import ResourceView from './pages/resources/ResourceView';
import './i18n/config';

// Define types
type ReactNode = React.ReactNode;

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
}

interface RouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

interface PublicRouteProps {
  children: ReactNode;
}

// Enhanced ProtectedRoute component with role support
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, requiredPermission }) => {
  const { isAuthenticated, user, hasPermission, hasRole, isLoading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have the required role to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Your role: {user?.role} | Required: {Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Permission Denied</h2>
          <p className="text-gray-600">You don't have the required permissions to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required permission: {requiredPermission}
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Role-specific route components
const StudentRoute: React.FC<RouteProps> = ({ children, requiredPermission }) => (
  <ProtectedRoute 
    requiredRole={['student', 'teacher', 'chapter_admin', 'platform_admin']}
    requiredPermission={requiredPermission}
  >
    {children}
  </ProtectedRoute>
);

const TeacherRoute: React.FC<RouteProps> = ({ children, requiredPermission }) => (
  <ProtectedRoute 
    requiredRole={['teacher', 'chapter_admin', 'platform_admin']}
    requiredPermission={requiredPermission}
  >
    {children}
  </ProtectedRoute>
);

const AdminRoute: React.FC<RouteProps> = ({ children, requiredPermission }) => (
  <ProtectedRoute 
    requiredRole={['chapter_admin', 'platform_admin']}
    requiredPermission={requiredPermission}
  >
    {children}
  </ProtectedRoute>
);

// Public route component (redirects authenticated users away from login/register)
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Dynamic dashboard based on user role
const DynamicDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'student') {
    return <StudentDashboard />;
  }
  
  // Teachers, chapter admins, and platform admins see teacher dashboard
  return <TeacherDashboard />;
};

// Main App Content that uses the auth context
function AppContent() {
  const { user, isLoading } = useAuth();

  // Show loading spinner while auth is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Show sidebar and header only for authenticated users */}
      {user ? (
        <div className="flex h-screen bg-gray-50">
          <Routes>
            {/* Dashboard - Accessible to all authenticated users */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DynamicDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />

            {/* Courses - Accessible to all authenticated users */}
            <Route 
              path="/courses" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <MyCourses />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            {/* Course Details - Accessible to all authenticated users */}
            <Route 
              path="/courses/:courseId" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <CourseDetails />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            {/* Create Course - Only for teachers and above */}
            <Route 
              path="/courses/new" 
              element={
                <TeacherRoute requiredPermission="course:create">
                  <DashboardLayout>
                    <CreateCourse />
                  </DashboardLayout>
                </TeacherRoute>
              } 
            />

            {/* Record Video - Only for teachers and above with video upload permission */}
            <Route 
              path="/record" 
              element={
                <TeacherRoute requiredPermission="video:upload">
                  <DashboardLayout>
                    <RecordVideo />
                  </DashboardLayout>
                </TeacherRoute>
              } 
            />

            {/* AI Assistant - Accessible to all authenticated users */}
            <Route 
              path="/ai-assistant" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <AIAssistant />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AdminDashboard />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AdminDashboard />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/content" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <ContentManagement />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/moderation" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <ModerationTools />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/analytics" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AnalyticsDashboard />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/tags" 
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <TagManager />
                  </DashboardLayout>
                </AdminRoute>
              } 
            />

            {/* Social Features */}
            <Route 
              path="/forums" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <Forums />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            <Route 
              path="/forums/:forumId" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <ForumTopics />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            <Route 
              path="/achievements" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <Achievements />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            <Route 
              path="/leaderboards" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <Leaderboards />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            <Route 
              path="/community" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <CommunityHub />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            {/* Resource Routes */}
            <Route 
              path="/resources" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <ResourceLibrary />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            <Route 
              path="/resources/:id" 
              element={
                <StudentRoute>
                  <DashboardLayout>
                    <ResourceView />
                  </DashboardLayout>
                </StudentRoute>
              } 
            />

            {/* Default rout */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Route */}
            <Route 
              path="*" 
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">Page not found</p>
                    <button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      ) : (
        /* Public routes without sidebar and header */
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
      
      {/* Floating AI Chat - Only show for authenticated users */}
      {user && <FloatingAIChat />}
    </div>
  );
}

// Main App component that provides the context
function App() {
  return (
    <Router>
      <AuthProvider>
        <UserProvider>
          <OnboardingProvider>
            <AppContent />
          </OnboardingProvider>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;