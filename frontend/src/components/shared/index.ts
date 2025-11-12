// Shared components barrel export
// Common components are in @/components/common, not here

// Courses
export * from './courses';

// AI
export { default as FloatingAIChat } from './ai/FloatingAIChat';
export { default as AIChatInterface } from './ai/AIChatInterface';
// Note: ChatInterface.tsx and AIChatBubble.tsx are empty files, not exported

// Auth
export * from './auth';

// Resources
export { default as DocumentViewer } from './resources/DocumentViewer';
export { default as NotesEditor } from './resources/NotesEditor';
export { default as AISummaryDisplay } from './resources/AISummaryDisplay';
export { default as ExportManager } from './resources/ExportManager';
export { default as ShareResourceModal } from './resources/ShareResourceModal';
export { default as AIFallbackHandler } from './resources/AIFallbackHandler';
export { default as ResourceErrorHandler } from './resources/ResourceErrorHandler';
// Note: ResourceCard.tsx is an empty file, not exported

// Social
export { default as ForumCard } from './social/ForumCard';
export { default as ForumPost } from './social/ForumPost';
export { default as BadgeCard } from './social/BadgeCard';
export { default as LeaderboardTable } from './social/LeaderboardTable';
// Note: AchievementBadge.tsx and Leaderboard.tsx are empty files, not exported

// Onboarding
export { default as OnboardingModal } from './onboarding/OnboardingModal';
export { default as OnboardingTest } from './onboarding/OnboardingTest';
export { default as StepIndicator } from './onboarding/StepIndicator';
export { default as WelcomeMessage } from './onboarding/WelcomeMessage';
export { default as CompletionRewards } from './onboarding/CompletionRewards';
export { default as ContextualHelp } from './onboarding/ContextualHelp';
export { default as OnboardingErrorHandler } from './onboarding/OnboardingErrorHandler';

// Notification system
export { NotificationSystem } from './NotificationSystem';
export { CardSkeleton, Spinner } from './LoadingStates';
export { DataTable } from './DataTable';
export type { ColumnDef, SortDirection } from './DataTable';
