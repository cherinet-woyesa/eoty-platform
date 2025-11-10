import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import TeacherDashboard from './components/dashboard/TeacherDashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard/StudentDashboard';
import DashboardLayout from './components/layout/DashboardLayout';
import './styles/globals.css';
import RecordVideo from './pages/courses/RecordVideo';
import MyCourses from './pages/courses/MyCourses';
import CourseCatalog from './pages/courses/CourseCatalog';
import StudentEnrolledCourses from './pages/courses/StudentEnrolledCourses';
import AllCourses from './pages/admin/AllCourses';
import CreateCourse from './pages/courses/CreateCourse';
import EditCourse from './pages/courses/EditCourse';
import CourseDetails from './pages/courses/CourseDetails';

import AIAssistant from './pages/ai/AIAssistant';
import FloatingAIChat from './components/ai/FloatingAIChat';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import { NotificationSystem } from './components/shared';
import { ProtectedRoute, StudentRoute, TeacherRoute, AdminRoute, DynamicDashboard } from './components/routing';
import Forums from './pages/social/Forums';
import ForumTopics from './pages/social/ForumTopics';
import Achievements from './pages/social/Achievements';
import Leaderboards from './pages/social/Leaderboards';
import CommunityHub from './pages/social/CommunityHub';
import AdminDashboard from './components/dashboard/AdminDashboard/AdminDashboard';
import ContentManagement from './pages/admin/ContentManagement';
import AdminCourseView from './pages/admin/AdminCourseView';
import { UserProvider } from './context/UserContext';
import { OnboardingProvider } from './context/OnboardingContext';
import ModerationTools from './components/admin/ModerationTools';
import AnalyticsDashboard from './components/admin/AnalyticsDashboard';
import TagManager from './components/admin/TagManager';
import UserManagement from './components/admin/UserManagement';
import UploadManager from './components/admin/UploadManager';
import SystemConfigDashboard from './pages/admin/config/SystemConfigDashboard';
import CategoryManagement from './pages/admin/config/CategoryManagement';
import LevelManagement from './pages/admin/config/LevelManagement';
import DurationManagement from './pages/admin/config/DurationManagement';
import TagManagement from './pages/admin/config/TagManagement';
import ChapterManagement from './pages/admin/config/ChapterManagement';
import MuxMigration from './pages/admin/MuxMigration';
import ResourceLibrary from './pages/resources/ResourceLibrary';
import ResourceView from './pages/resources/ResourceView';
import QuizDemo from './pages/courses/QuizDemo';
import ProgressPage from './pages/courses/ProgressPage';
import DiscussionDemo from './pages/courses/DiscussionDemo';
import Students from './pages/students/Students';
import LearningPathsPage from './pages/student/LearningPathsPage';
import BookmarksPage from './pages/student/BookmarksPage';
import SchedulePage from './pages/student/SchedulePage';
import StudyGroupsPage from './pages/student/StudyGroupsPage';
import HelpPage from './pages/student/HelpPage';
import TeacherProfile from './pages/teachers/TeacherProfile';
import { queryClient } from './lib/queryClient';
import './i18n/config';

// Define types
type ReactNode = React.ReactNode;

interface PublicRouteProps {
  children: ReactNode;
}

// Public route component (redirects authenticated users away from login/register)
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    // Redirect admins to admin dashboard, others to regular dashboard
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
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
    <div className="App w-full h-full">
      <Routes>
        {/* Public routes */}
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

        {/* Authenticated routes */}
        {/* Dashboard - Accessible to all authenticated users */}
        {/* Generic dashboard route - redirects to role-specific dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DynamicDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Student Dashboard */}
        <Route 
          path="/student/dashboard" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentDashboard />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Teacher Dashboard */}
        <Route 
          path="/teacher/dashboard" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherDashboard />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        {/* Student Courses - Browse catalog and enrolled courses */}
        <Route 
          path="/courses" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CourseCatalog />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Course Catalog - Alias for /courses */}
        <Route 
          path="/catalog" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CourseCatalog />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Student Course Routes - Specific routes before parameterized ones */}
        <Route 
          path="/student/courses" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentEnrolledCourses />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        <Route 
          path="/student/my-courses" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentEnrolledCourses />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        <Route 
          path="/student/courses/:courseId" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CourseDetails />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/progress" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <ProgressPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/achievements" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <Achievements />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        {/* New Student Routes */}
        <Route 
          path="/student/learning-paths" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <LearningPathsPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/bookmarks" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <BookmarksPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/schedule" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <SchedulePage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/study-groups" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudyGroupsPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        <Route 
          path="/student/help" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <HelpPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        {/* Legacy student routes - redirect to namespaced routes */}
        <Route path="/courses/:courseId" element={<Navigate to={`/student/courses/${window.location.pathname.split('/')[2]}`} replace />} />
        <Route path="/progress" element={<Navigate to="/student/progress" replace />} />
        <Route path="/achievements" element={<Navigate to="/student/achievements" replace />} />

        {/* Teacher Routes - All under /teacher prefix */}
        <Route 
          path="/teacher/courses" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <MyCourses />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/courses/new" 
          element={
            <TeacherRoute requiredPermission="course:create">
              <DashboardLayout>
                <CreateCourse />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/courses/:courseId" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <CourseDetails />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/courses/:courseId/edit" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <EditCourse />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/record" 
          element={
            <TeacherRoute requiredPermission="video:upload">
              <DashboardLayout>
                <RecordVideo />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/students" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <Students />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/analytics" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <AnalyticsDashboard />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/profile" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherProfile />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        {/* Legacy teacher routes - redirect to namespaced routes */}
        <Route path="/courses/new" element={<Navigate to="/teacher/courses/new" replace />} />
        <Route path="/record" element={<Navigate to="/teacher/record" replace />} />
        <Route path="/students" element={<Navigate to="/teacher/students" replace />} />
        <Route path="/analytics" element={<Navigate to="/teacher/analytics" replace />} />

        {/* Demo Routes - Under /teacher for testing */}


        {/* Shared Routes - Accessible to all authenticated users */}
        <Route 
          path="/ai-assistant" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AIAssistant />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes - All under /admin prefix */}
        <Route 
          path="/admin/courses" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AllCourses />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/courses/:courseId" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminCourseView />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* Admin Routes - All properly namespaced under /admin */}
        <Route 
          path="/admin" 
          element={<Navigate to="/admin/dashboard" replace />} 
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
          path="/admin/users" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <UserManagement />
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
          path="/admin/tags" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <TagManager />
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
          path="/admin/mux-migration" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <MuxMigration />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/uploads" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <UploadManager />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* System Configuration Routes */}
        <Route 
          path="/admin/config/dashboard" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <SystemConfigDashboard />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/config/categories" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <CategoryManagement />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/config/levels" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <LevelManagement />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/config/durations" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <DurationManagement />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/config/tags" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <TagManagement />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/config/chapters" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <ChapterManagement />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* Social Features - Accessible to all authenticated users */}
        <Route 
          path="/forums" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Forums />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/forums/:forumId" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ForumTopics />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/leaderboards" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Leaderboards />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/community" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CommunityHub />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Resource Routes - Accessible to all authenticated users */}
        <Route 
          path="/resources" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ResourceLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/resources/:id" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ResourceView />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Demo Routes - For testing */}
        <Route 
          path="/quiz-demo" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <QuizDemo />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/discussion-demo" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DiscussionDemo />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Default route - redirect to login or dashboard based on auth status */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Navigate to="/login" replace />
            </PublicRoute>
          } 
        />

        {/* Catch-all 404 route */}
        <Route 
          path="/*" 
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
      
      {/* Floating AI Chat - Only show for authenticated users */}
      {user && <FloatingAIChat />}
    </div>
  );
}

// Main App component that provides the context
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <UserProvider>
            <OnboardingProvider>
              <NotificationProvider>
                <ConfirmDialogProvider>
                  <AppContent />
                  <NotificationSystem />
                </ConfirmDialogProvider>
              </NotificationProvider>
            </OnboardingProvider>
          </UserProvider>
        </AuthProvider>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;