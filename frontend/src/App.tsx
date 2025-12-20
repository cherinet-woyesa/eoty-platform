import * as React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import '@/styles/globals.css';

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
import CreateForum from '@/pages/shared/social/CreateForum';
import TopicDetail from '@/pages/shared/social/TopicDetail';
import DiscussionThread from '@/pages/shared/social/DiscussionThread';
import CreateTopic from '@/pages/shared/social/CreateTopic';
import Achievements from '@/pages/shared/social/Achievements';
import TeacherAchievements from '@/pages/teacher/TeacherAchievements';
import Leaderboards from '@/pages/shared/social/Leaderboards';
import CommunityHub from '@/pages/shared/social/CommunityHub';
import AdminDashboard from '@/components/admin/dashboard/AdminDashboard';
import ContentManagement from '@/pages/admin/ContentManagement';
import AdminCourseView from '@/pages/admin/AdminCourseView';
import AdminProfile from '@/pages/admin/AdminProfile';
import { UserProvider } from '@/context/UserContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { LocalizationProvider } from '@/context/LocalizationContext';
import ModerationTools from '@/components/admin/moderation/ModerationTools';
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard';
import TagManager from '@/components/admin/content/TagManager';
import AIFaithLabeling from '@/pages/admin/AIFaithLabeling';
import UserManagement from '@/components/admin/users/UserManagement';
import TeacherApplications from '@/components/admin/users/TeacherApplications';
import UploadManager from '@/components/admin/content/UploadManager';
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
import AdminCreateCourse from '@/pages/admin/AdminCreateCourse';
import LocalizationSettingsPage from '@/pages/shared/settings/LocalizationSettingsPage';
import ProgressPage from '@/pages/student/ProgressPage';
import StudentManagement from '@/pages/teacher/StudentManagement';
import SpiritualJourneys from '@/pages/student/SpiritualJourneys';
import JourneyDetail from '@/pages/student/JourneyDetail';
import GlobalChapterMap from '@/pages/student/GlobalChapterMap';
import JourneysAdmin from '@/pages/admin/JourneysAdmin';
import LearningPathsPage from '@/pages/student/LearningPathsPage';
import BookmarksPage from '@/pages/student/BookmarksPage';
import StudyGroupsPage from '@/pages/student/community/StudyGroupsPage';
import GroupDetailPage from '@/pages/student/community/GroupDetailPage';
import HelpPage from '@/pages/student/HelpPage';
import CoursesPage from '@/pages/student/CoursesPage';
import CommunityPage from '@/pages/student/community/CommunityPage';
import LearningPage from '@/pages/student/LearningPage';
import ResourcesPage from '@/pages/student/ResourcesPage';
import TeacherProfile from '@/pages/teacher/TeacherProfile';
import StudentProfile from '@/pages/student/StudentProfile';
import Assignments from '@/pages/teacher/assignments/Assignments';
import AssignmentCreate from '@/pages/teacher/assignments/AssignmentCreate';
import AssignmentEdit from '@/pages/teacher/assignments/AssignmentEdit';
import AssignmentDetail from '@/pages/teacher/assignments/AssignmentDetail';
import InviteStudent from '@/pages/teacher/InviteStudent';
import TeacherCoursesPage from '@/pages/teacher/TeacherCoursesPage';
import TeacherStudentsPage from '@/pages/teacher/TeacherStudentsPage';
const TeacherContentPage = lazy(() => import('@/pages/teacher/TeacherContentPage'));
import TeacherCommunityPage from '@/pages/teacher/TeacherCommunityPage';
import TeacherResourcePage from '@/pages/teacher/TeacherResourcePage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminContentPage from '@/pages/admin/AdminContentPage';
import AdminSystemPage from '@/pages/admin/AdminSystemPage';
import AdminCommunicationsPage from '@/pages/admin/AdminCommunicationsPage';
import AdminCommunityPage from '@/pages/admin/AdminCommunityPage';
import Invitations from '@/pages/student/Invitations';
import StudentAssignments from '@/pages/student/Assignments';
import ClassroomLayout from '@/pages/student/classroom/ClassroomLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
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
  <LoadingSpinner fullScreen size="xl" text="Loading..." variant="logo" />
);

// Lazy loaded pages
const Landing = lazy(() => import('@/pages/shared/Landing'));
const Login = lazy(() => import('@/pages/shared/auth/Login'));
const Register = lazy(() => import('@/pages/shared/auth/Register'));
// const Unauthorized = lazy(() => import('@/pages/auth/Unauthorized')); // Not found and unused
// const NotFound = lazy(() => import('@/pages/NotFound')); // Not found and unused
const MyCourses = lazy(() => import('@/pages/teacher/MyCourses'));
const CourseCatalog = lazy(() => import('@/pages/student/courses/CourseCatalog'));
// const CoursePlayer = lazy(() => import('@/pages/student/CoursePlayer')); // Unused and not found
const CreateCourse = lazy(() => import('@/pages/teacher/CreateCourse'));
const EditCourse = lazy(() => import('@/pages/teacher/EditCourse'));
const TeacherDashboard = lazy(() => import('@/components/teacher/dashboard/TeacherDashboard'));
const StudentDashboard = lazy(() => import('@/components/student/dashboard/StudentDashboard'));
const ForgotPassword = lazy(() => import('@/pages/shared/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/shared/auth/ResetPassword'));
const EmailVerification = lazy(() => import('@/pages/shared/auth/EmailVerification'));
const GoogleCallback = lazy(() => import('@/pages/shared/auth/GoogleCallback'));
const CompleteProfile = lazy(() => import('@/pages/shared/auth/CompleteProfile.tsx'));
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'));
const StudentEnrolledCourses = lazy(() => import('@/pages/student/courses/StudentEnrolledCourses'));
const StudentVideos = lazy(() => import('@/pages/student/StudentVideos'));
const AIAssistant = lazy(() => import('@/pages/shared/ai/AIAssistant'));
const AllCourses = lazy(() => import('@/pages/admin/AllCourses'));
const FloatingAIChat = lazy(() => import('@/components/shared/ai/FloatingAIChat'));

// Lazy load heavy pages
const LazyRecordVideo = lazy(() => import('@/pages/teacher/RecordVideo'));
const LazyVideoAnalyticsDashboard = lazy(() => import('@/components/teacher/dashboard/VideoAnalyticsDashboard'));
const LazyLandingPageEditor = lazy(() => import('@/pages/admin/LandingPageEditor'));
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
    return <PageLoader />;
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
  const location = useLocation();

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
    <Suspense fallback={<PageLoader />}>
      <div className="App w-full h-full">
        <Routes>
          {/* Public routes */}
          <Route path="/donate" element={<Navigate to="/#donation-section" replace />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          {/* Normalize capitalized login URL to avoid blank screen */}
          <Route path="/Login" element={<Navigate to="/login" replace />} />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/verify-email"
            element={<EmailVerification />}
          />
          <Route
            path="/auth/google/callback"
            element={<GoogleCallback />}
          />
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute>
                <CompleteProfile />
              </ProtectedRoute>
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

          {/* Member Dashboard (renamed from Student) */}
          <Route
            path="/member/dashboard"
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

          {/* ========== CONSOLIDATED MEMBER PAGES (was student) ========== */}

          {/* Consolidated Courses Page - My Courses | Browse | Bookmarks */}
          <Route
            path="/member/all-courses"
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
            path="/member/learning"
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
            path="/member/community"
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
            path="/member/all-resources"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <ResourcesPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* ========== LEGACY STUDENT ROUTES (Keep for backward compatibility) ========== */}

          {/* Member Courses - Browse catalog (renamed from student) */}
          <Route
            path="/member/browse-courses"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <CourseCatalog />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* Course Catalog - Alias for member browse courses */}
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

          {/* Member Course Routes - Specific routes before parameterized ones */}
          <Route
            path="/member/courses"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <StudentEnrolledCourses />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/my-courses"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <StudentEnrolledCourses />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/courses/:courseId"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <CourseDetails />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/videos"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <StudentVideos />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/progress"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <ProgressPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/achievements"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <Achievements />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/journeys"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <SpiritualJourneys />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/journeys/:id"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <JourneyDetail />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/chapters/map"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <GlobalChapterMap />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* New Member Routes */}
          <Route
            path="/member/learning-paths"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <LearningPathsPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/bookmarks"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <BookmarksPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/study-groups"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <StudyGroupsPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/study-groups/:groupId"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <GroupDetailPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* New Classroom Experience - Full Screen (No DashboardLayout) */}
          <Route
            path="/classroom/:courseId"
            element={
              <StudentRoute>
                <ClassroomLayout />
              </StudentRoute>
            }
          />
          <Route
            path="/classroom/:courseId/lesson/:lessonId"
            element={
              <StudentRoute>
                <ClassroomLayout />
              </StudentRoute>
            }
          />

          <Route
            path="/member/help"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <HelpPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          <Route
            path="/member/profile"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <StudentProfile />
                </DashboardLayout>
              </StudentRoute>
            }
          />
          <Route
            path="/member/invitations"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <Invitations />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* Legacy student routes - redirect to member routes */}
          <Route path="/courses/:courseId" element={<Navigate to={`/member/courses/${window.location.pathname.split('/')[2]}`} replace />} />
          <Route path="/progress" element={<Navigate to="/member/progress" replace />} />
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
            path="/teacher/courses"
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

          {/* Teacher Resource Management Page - Upload & Manage Resources */}
          <Route
            path="/teacher/resources/*"
            element={
              <TeacherRoute>
                <DashboardLayout>
                  <TeacherResourcePage />
                </DashboardLayout>
              </TeacherRoute>
            }
          />

          {/* Consolidated Teacher Community Page - Discussions | Chapters | Achievements */}
          <Route
            path="/teacher/community/*"
            element={
              <TeacherRoute>
                <DashboardLayout>
                  <TeacherCommunityPage />
                </DashboardLayout>
              </TeacherRoute>
            }
          />

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

          {/* ========== LEGACY TEACHER ROUTES (Keep for backward compatibility) ========== */}

          {/* Teacher Routes - All under /teacher prefix */}
          {/* /teacher/courses is now the consolidated page above */}

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
            path="/member/ai-assistant"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <AIAssistant />
                </DashboardLayout>
              </StudentRoute>
            }
          />
          <Route
            path="/member/assignments"
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

          {/* Admin Communications Page */}
          <Route
            path="/admin/communications"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminCommunicationsPage />
                </DashboardLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/community/*"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminCommunityPage />
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
            path="/admin/courses/create"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminCreateCourse />
                </DashboardLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/courses/new"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminCreateCourse />
                </DashboardLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/ai-labeling"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AIFaithLabeling />
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
                    <LazyLandingPageEditor />
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

          <Route
            path="/member/forums"
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
            path="/forums/create"
            element={
              <TeacherRoute>
                <DashboardLayout>
                  <CreateForum />
                </DashboardLayout>
              </TeacherRoute>
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
            path="/forums/:forumId/topics/:topicId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TopicDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/forums/:discussionId/thread"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DiscussionThread />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/forums/:forumId/new-topic"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CreateTopic />
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
            path="/member/community/*"
            element={
              <StudentRoute>
                <DashboardLayout>
                  <CommunityPage />
                </DashboardLayout>
              </StudentRoute>
            }
          />

          {/* Resource Routes - Role-specific */}

          <Route
            path="/member/resources"
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
            path="/teacher/community/*"
            element={
              <TeacherRoute>
                <DashboardLayout>
                  <TeacherCommunityPage />
                </DashboardLayout>
              </TeacherRoute>
            }
          />
          <Route
            path="/member/chapters"
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

          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HelpPage />
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

        {/* Profile Completion Notification - Show for new users, but not on landing page */}
        {user && location.pathname !== '/' && <ProfileCompletionNotification show={true} />}
      </div>
    </Suspense>
  );
}

// Main App component that provides the context
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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