// Shared pages barrel export
// Auth
export { default as Login } from './auth/Login';
export { default as Register } from './auth/Register';

// AI
export { default as AIAssistant } from './ai/AIAssistant';

// Social
export { default as Forums } from './social/Forums';
export { default as ForumTopics } from './social/ForumTopics';
export { default as Achievements } from './social/Achievements';
export { default as Leaderboards } from './social/Leaderboards';
export { default as CommunityHub } from './social/CommunityHub';

// Resources
export { default as ResourceLibrary } from './resources/ResourceLibrary';
export { default as ResourceView } from './resources/ResourceView';

// Courses (shared)
export { default as CourseDetails } from './courses/CourseDetails';
export { default as LessonView } from './courses/LessonView';
// QuizDemo and DiscussionDemo removed from barrel export - imported directly in App.tsx
export { default as CourseHub } from './courses/CourseHub';

