import * as React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import Landing from '@/pages/shared/Landing';
import Login from '@/pages/shared/auth/Login';
import Register from '@/pages/shared/auth/Register';
import TeacherDashboard from '@/components/teacher/dashboard/TeacherDashboard';
import StudentDashboard from '@/components/student/dashboard/StudentDashboard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '@/styles/globals.css';
import MyCourses from '@/pages/teacher/MyCourses';
import CourseCatalog from '@/pages/student/CourseCatalog';
import StudentEnrolledCourses from '@/pages/student/StudentEnrolledCourses';
import StudentVideos from '@/pages/student/StudentVideos';
import AllCourses from '@/pages/admin/AllCourses';
import CreateCourse from '@/pages/teacher/CreateCourse';
import EditCourse from '@/pages/teacher/EditCourse';

import AIAssistant from '@/pages/shared/ai/AIAssistant';
import FloatingAIChat from '@/components/shared/ai/FloatingAIChat';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ConfirmDialogProvider } from '@/context/ConfirmDialogContext';
import { NotificationSystem } from '@/components/shared';
import { ProtectedRoute, StudentRoute, TeacherRoute, AdminRoute, DynamicDashboard, DynamicCourses } from '@/components/routing';
import { DynamicAIAssistant, DynamicForums, DynamicResources, DynamicChapters, DynamicAchievements } from '@/components/routing/DynamicRoutes';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ProfileCompletionNotification from '@/components/shared/ProfileCompletionNotification';
import Forums from '@/pages/shared/social/Forums';
import ForumTopics from '@/pages/shared/social/ForumTopics';
import Achievements from '@/pages/shared/social/Achievements';
import TeacherAchievements from '@/pages/teacher/TeacherAchievements';
import UploadResource from '@/pages/teacher/UploadResource';
import Leaderboards from '@/pages/shared/social/Leaderboards';
import CommunityHub from '@/pages/shared/social/CommunityHub';
import AdminDashboard from '@/components/admin/dashboard/AdminDashboard';
import ContentManagement from '@/pages/admin/ContentManagement';
import AdminCourseView from '@/pages/admin/AdminCourseView';
import AdminProfile from '@/pages/admin/AdminProfile';
import { UserProvider } from '@/context/UserContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { LocalizationProvider } from '@/context/LocalizationContext';
import ModerationTools from '@/components/admin/ModerationTools';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import TagManager from '@/components/admin/TagManager';
import UserManagement from '@/components/admin/UserManagement';
import TeacherApplications from '@/components/admin/TeacherApplications';
import UploadManager from '@/components/admin/UploadManager';
import SystemConfigDashboard from '@/pages/admin/config/SystemConfigDashboard';
import CategoryManagement from '@/pages/admin/config/CategoryManagement';
import LevelManagement from '@/pages/admin/config/LevelManagement';
import DurationManagement from '@/pages/admin/config/DurationManagement';
import TagManagement from '@/pages/admin/config/TagManagement';
import ChapterManagement from '@/pages/admin/config/ChapterManagement';
import ResourceLibrary from '@/pages/shared/resources/ResourceLibrary';
import ResourceView from '@/pages/shared/resources/ResourceView';
import { CourseDetails } from '@/pages/shared';
import ChaptersPage from '@/pages/shared/chapters/ChaptersPage';
import ActivityLogsPage from '@/pages/shared/activity/ActivityLogsPage';
import AdminActivityLogs from '@/pages/admin/AdminActivityLogs';
import LocalizationSettingsPage from '@/pages/shared/settings/LocalizationSettingsPage';
import ProgressPage from '@/pages/student/ProgressPage';
import StudentManagement from '@/pages/teacher/StudentManagement';
import SpiritualJourneys from '@/pages/student/SpiritualJourneys';
import JourneysAdmin from '@/pages/admin/JourneysAdmin';
import LearningPathsPage from '@/pages/student/LearningPathsPage';
import BookmarksPage from '@/pages/student/BookmarksPage';
import StudyGroupsPage from '@/pages/student/StudyGroupsPage';
import GroupDetailPage from '@/pages/student/GroupDetailPage';
import HelpPage from '@/pages/student/HelpPage';
import CoursesPage from '@/pages/student/CoursesPage';
import CommunityPage from '@/pages/student/CommunityPage';
import LearningPage from '@/pages/student/LearningPage';
import ResourcesPage from '@/pages/student/ResourcesPage';
import TeacherProfile from '@/pages/teacher/TeacherProfile';
import StudentProfile from '@/pages/student/StudentProfile';
import Assignments from '@/pages/teacher/Assignments';
import AssignmentCreate from '@/pages/teacher/AssignmentCreate';
import AssignmentEdit from '@/pages/teacher/AssignmentEdit';
import AssignmentDetail from '@/pages/teacher/AssignmentDetail';
import InviteStudent from '@/pages/teacher/InviteStudent';
import TeacherCoursesPage from '@/pages/teacher/TeacherCoursesPage';
import TeacherStudentsPage from '@/pages/teacher/TeacherStudentsPage';
import TeacherContentPage from '@/pages/teacher/TeacherContentPage';
import TeacherCommunityPage from '@/pages/teacher/TeacherCommunityPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminContentPage from '@/pages/admin/AdminContentPage';
import AdminSystemPage from '@/pages/admin/AdminSystemPage';
import Invitations from '@/pages/student/Invitations';
import StudentAssignments from '@/pages/student/Assignments';
import { queryClient } from '@/lib/queryClient';
import '@/i18n/config';

// Lazy load ReactQueryDevtools only in development
const LazyReactQueryDevtools = lazy(() => 
  import('@tanstack/react-query-devtools').then(module => ({
    default: () => <module.ReactQueryDevtools initialIsOpen={false} />
  }))
);

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-t-4 border-[#39FF14] border-solid rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-stone-600">Loading...</p>
    </div>
  </div>
);

// Lazy load heavy pages
const LazyRecordVideo = lazy(() => import('@/pages/teacher/RecordVideo'));
const LazyVideoAnalyticsDashboard = lazy(() => import('@/components/teacher/dashboard/VideoAnalyticsDashboard'));
const LazyMuxMigration = lazy(() => import('@/pages/admin/MuxMigration'));
const LazyQuizDemo = lazy(() => import('@/pages/shared/courses/QuizDemo'));
const LazyDiscussionDemo = lazy(() => import('@/pages/shared/courses/DiscussionDemo'));

// Define types
type ReactNode = React.ReactNode;

interface PublicRouteProps {
  children: ReactNode;
}

// Public route component (redirects authenticated users away from login/register)
// Note: Landing page is NOT wrapped in this - it's accessible to everyone
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
  
  // Only redirect authenticated users away from login/register pages
  // Landing page is handled separately and accessible to everyone
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

        {/* ========== CONSOLIDATED STUDENT PAGES ========== */}
        
        {/* Consolidated Courses Page - My Courses | Browse | Bookmarks */}
        <Route 
          path="/student/all-courses" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CoursesPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Consolidated Learning Page - Progress | Assignments | Paths | Achievements */}
        <Route 
          path="/student/learning" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <LearningPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Consolidated Community Page - Feed | Groups | Forums | Chapters */}
        <Route 
          path="/student/community-hub" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CommunityPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Consolidated Resources Page - Library | Help */}
        <Route 
          path="/student/all-resources" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <ResourcesPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        {/* ========== LEGACY STUDENT ROUTES (Keep for backward compatibility) ========== */}

        {/* Student Courses - Browse catalog (students only) */}
        <Route 
          path="/student/browse-courses" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CourseCatalog />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        
        {/* Course Catalog - Alias for student browse courses */}
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
        
        {/* Legacy /courses route - redirects based on role */}
        <Route 
          path="/courses" 
          element={<DynamicCourses />}
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
          path="/student/videos" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentVideos />
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

        <Route 
          path="/student/journeys" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <SpiritualJourneys />
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
          path="/student/study-groups/:groupId" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <GroupDetailPage />
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

        <Route 
          path="/student/profile" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentProfile />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route
          path="/student/invitations"
          element={
            <StudentRoute>
              <DashboardLayout>
                <Invitations />
              </DashboardLayout>
            </StudentRoute>
          }
        />

        {/* Legacy student routes - redirect to namespaced routes */}
        <Route path="/courses/:courseId" element={<Navigate to={`/student/courses/${window.location.pathname.split('/')[2]}`} replace />} />
        <Route path="/progress" element={<Navigate to="/student/progress" replace />} />
        <Route 
          path="/achievements" 
          element={
            <ProtectedRoute>
              <DynamicAchievements />
            </ProtectedRoute>
          } 
        />

        {/* ========== CONSOLIDATED TEACHER PAGES ========== */}
        
        {/* Consolidated Teacher Courses Page - My Courses | Create | Browse */}
        <Route 
          path="/teacher/all-courses" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherCoursesPage />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        
        {/* Consolidated Teacher Students Page - Students | Assignments | Analytics */}
        <Route 
          path="/teacher/all-students" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherStudentsPage />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        
        {/* Consolidated Teacher Content Page - Record | Upload | Resources */}
        <Route 
          path="/teacher/content" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherContentPage />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        
        {/* Consolidated Teacher Community Page - Discussions | Chapters | Achievements */}
        <Route 
          path="/teacher/community" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherCommunityPage />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        {/* ========== LEGACY TEACHER ROUTES (Keep for backward compatibility) ========== */}

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
                <Suspense fallback={<PageLoader />}>
                  <LazyRecordVideo />
                </Suspense>
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/students" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <StudentManagement />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/teacher/students/invite" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <InviteStudent />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/analytics" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <LazyVideoAnalyticsDashboard />
                </Suspense>
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/achievements" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <TeacherAchievements />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        <Route 
          path="/teacher/resources/upload" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <UploadResource />
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

        <Route 
          path="/teacher/assignments" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <Assignments />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/teacher/assignments/new" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <AssignmentCreate />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/teacher/assignments/:assignmentId" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <AssignmentDetail />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/teacher/assignments/:assignmentId/edit" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <AssignmentEdit />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />

        {/* Legacy teacher routes - redirect to namespaced routes */}
        <Route path="/courses/new" element={<Navigate to="/teacher/courses/new" replace />} />
        <Route path="/record" element={<Navigate to="/teacher/record" replace />} />
        <Route path="/students" element={<Navigate to="/teacher/students" replace />} />
        <Route path="/analytics" element={<Navigate to="/teacher/analytics" replace />} />
        <Route path="/assignments" element={<Navigate to="/teacher/assignments" replace />} />

        {/* Demo Routes - Under /teacher for testing */}


        {/* AI Assistant Routes - Role-specific */}
        <Route 
          path="/teacher/ai-assistant" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <AIAssistant />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/student/ai-assistant" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <AIAssistant />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route 
          path="/student/assignments" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <StudentAssignments />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route 
          path="/admin/ai-assistant" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AIAssistant />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        {/* Legacy route - redirect based on role */}
        <Route 
          path="/ai-assistant" 
          element={
            <ProtectedRoute>
              <DynamicAIAssistant />
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

        <Route 
          path="/admin/courses/:courseId/edit" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <EditCourse />
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
          path="/admin/profile" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminProfile />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* ========== CONSOLIDATED ADMIN PAGES ========== */}
        
        {/* Consolidated Admin Users Page - Users | Chapters | Roles */}
        <Route 
          path="/admin/all-users" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminUsersPage />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        
        {/* Consolidated Admin Content Page - Uploads | Moderation | Tags | Courses */}
        <Route 
          path="/admin/all-content" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminContentPage />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        
        {/* Consolidated Admin System Page - Analytics | Config | Logs | Mux | Landing */}
        <Route 
          path="/admin/system" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminSystemPage />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* ========== LEGACY ADMIN ROUTES (Keep for backward compatibility) ========== */}

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
          path="/admin/teacher-applications" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <TeacherApplications />
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
          path="/admin/journeys" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <JourneysAdmin />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/mux-migration" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <LazyMuxMigration />
                </Suspense>
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

        {/* Forums Routes - Role-specific */}
        <Route 
          path="/teacher/forums" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <Forums />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/student/forums" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <Forums />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route 
          path="/admin/forums" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <Forums />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        {/* Legacy route - redirect based on role */}
        <Route 
          path="/forums" 
          element={
            <ProtectedRoute>
              <DynamicForums />
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

        <Route 
          path="/student/community" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <CommunityHub />
              </DashboardLayout>
            </StudentRoute>
          } 
        />

        {/* Resource Routes - Role-specific */}
        <Route 
          path="/teacher/resources" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <ResourceLibrary />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/student/resources" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <ResourceLibrary />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route 
          path="/admin/resources" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <ResourceLibrary />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        {/* Legacy route - redirect based on role */}
        <Route 
          path="/resources" 
          element={
            <ProtectedRoute>
              <DynamicResources />
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

        {/* Chapters Routes - Role-specific */}
        <Route 
          path="/teacher/chapters" 
          element={
            <TeacherRoute>
              <DashboardLayout>
                <ChaptersPage />
              </DashboardLayout>
            </TeacherRoute>
          } 
        />
        <Route 
          path="/student/chapters" 
          element={
            <StudentRoute>
              <DashboardLayout>
                <ChaptersPage />
              </DashboardLayout>
            </StudentRoute>
          } 
        />
        <Route 
          path="/admin/chapters" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <ChaptersPage />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        <Route 
          path="/admin/activity-logs" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <AdminActivityLogs />
              </DashboardLayout>
            </AdminRoute>
          } 
        />

        {/* Legacy route - redirect based on role */}
        <Route 
          path="/chapters" 
          element={
            <ProtectedRoute>
              <DynamicChapters />
            </ProtectedRoute>
          } 
        />

        {/* Legacy activity-logs route - redirect to admin route for admins */}
        <Route 
          path="/activity-logs" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ActivityLogsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings/localization" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LocalizationSettingsPage />
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
                <Suspense fallback={<PageLoader />}>
                  <LazyQuizDemo />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/discussion-demo" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <LazyDiscussionDemo />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Landing Page - Always accessible (no redirect for authenticated users) */}
        <Route 
          path="/" 
          element={<Landing />}
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
      
      {/* Profile Completion Notification - Show for new users */}
      {user && <ProfileCompletionNotification show={true} />}
    </div>
  );
}

// Main App component that provides the context
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <UserProvider>
              <OnboardingProvider>
                <LocalizationProvider>
                  <NotificationProvider>
                    <ConfirmDialogProvider>
                      <ErrorBoundary>
                        <AppContent />
                        <NotificationSystem />
                      </ErrorBoundary>
                    </ConfirmDialogProvider>
                  </NotificationProvider>
                </LocalizationProvider>
              </OnboardingProvider>
            </UserProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <LazyReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;