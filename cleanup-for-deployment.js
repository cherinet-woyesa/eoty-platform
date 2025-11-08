#!/usr/bin/env node

/**
 * Cleanup Script for Deployment
 * Removes unnecessary files before deploying to production
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up codebase for deployment...\n');

// Files to delete (relative to project root)
const filesToDelete = [
  // Test and debug scripts in backend
  'backend/test-mux-credentials.js',
  'backend/test-mux-analytics.js',
  'backend/test-mux-asset-management.js',
  'backend/test-provider-detection.js',
  'backend/test-analytics-api.js',
  'backend/test-engagement-simple.js',
  'backend/test-lesson-api.js',
  'backend/test-course-api.js',
  'backend/test-system-config-seeds.js',
  'backend/test-mux-migration.js',
  
  // Database fix/debug scripts
  'backend/fix-migrations.js',
  'backend/fix-users-table.js',
  'backend/fix-user-sequence.js',
  'backend/fix-users-seed.js',
  'backend/fix-and-create-users.js',
  'backend/create-users-simple.js',
  'backend/create-test-users.js',
  'backend/reset-passwords.js',
  'backend/reset-errored-lessons.js',
  'backend/add-course-columns.js',
  'backend/add_course_columns.sql',
  
  // Database check scripts
  'backend/check-chapters.js',
  'backend/check-stuck-uploads.js',
  'backend/check-all-videos.js',
  'backend/check-lesson-videos.js',
  'backend/list-lessons.js',
  'backend/list-users.js',
  'backend/check-mux-asset.js',
  'backend/sync-mux-status.js',
  
  // Temporary documentation files
  'RECORDING_FIX_PLAN.md',
  'COMPLETE_DIAGNOSIS_AND_STATUS.md',
  'CHECK_BROWSER_CODECS.md',
  'FINAL_FIX_SUMMARY.md',
  'VIDEO_FIX_COMPLETE.md',
  'TESTING_VIDEO_UPLOAD.md',
  'VIDEO_UPLOAD_FIX_SUMMARY.md',
  'VIDEO_PLAYBACK_DIAGNOSIS.md',
  
  // Frontend demo/test files
  'frontend/src/components/courses/LessonEditorDemo.tsx',
  'frontend/src/components/courses/LessonListDemo.tsx',
  'frontend/src/components/courses/CourseEditorDemo.tsx',
  'frontend/src/components/courses/CoursePublisherDemo.tsx',
  'frontend/src/components/courses/ProgressTrackerDemo.tsx',
  'frontend/src/components/courses/EnrollmentStatsDemo.tsx',
  'frontend/src/components/shared/SharedComponentsDemo.tsx',
  'frontend/src/examples/SharedComponentsIntegration.tsx',
  'frontend/src/utils/BrowserCompatibilityDemo.ts',
  'frontend/src/utils/VideoCompositorDemo.ts',
  
  // Frontend documentation that's not needed in production
  'frontend/src/utils/BROWSER_COMPATIBILITY_QUICK_REFERENCE.md',
  'frontend/src/utils/TASK_6_COMPLETION_SUMMARY.md',
  'frontend/src/utils/BROWSER_COMPATIBILITY_IMPLEMENTATION.md',
  'frontend/src/utils/BROWSER_COMPATIBILITY.md',
  'frontend/src/utils/PERFORMANCE_OPTIMIZATION_SUMMARY.md',
  'frontend/src/components/shared/README.md',
  
  // Backend documentation (keep in docs folder, remove from root)
  'backend/docs/TASK_2_DATA_MIGRATION_SUMMARY.md',
  'backend/docs/TASK_2_IMPLEMENTATION_SUMMARY.md',
  'backend/docs/TASK_4_IMPLEMENTATION_SUMMARY.md',
  'backend/docs/TASK_6_IMPLEMENTATION_SUMMARY.md',
  'backend/docs/TASK_6_MIGRATION_GUIDE.md',
  'backend/docs/TASK_10_IMPLEMENTATION_SUMMARY.md',
  'backend/docs/ANALYTICS_TESTING_GUIDE.md',
  'backend/docs/MUX_INTEGRATION_TASK_1.md',
  'backend/docs/MUX_INTEGRATION_TASK_2.md',
  'backend/docs/MUX_INTEGRATION_TASK_3.md',
  'backend/docs/MUX_INTEGRATION_PROGRESS.md',
];

// Directories to keep but document
const docsToKeep = [
  'backend/docs/MUX_SETUP_GUIDE.md',
  'backend/docs/COURSE_API_ENDPOINTS.md',
  'backend/docs/COURSE_ROUTES_RBAC.md',
  'backend/docs/analytics-api.md',
  'backend/docs/course-management-api.md',
  'backend/docs/lesson-management-api.md',
];

let deletedCount = 0;
let notFoundCount = 0;
let errors = 0;

console.log('Deleting unnecessary files...\n');

filesToDelete.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Deleted: ${file}`);
      deletedCount++;
    } else {
      console.log(`⚠️  Not found: ${file}`);
      notFoundCount++;
    }
  } catch (error) {
    console.log(`❌ Error deleting ${file}: ${error.message}`);
    errors++;
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 CLEANUP SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Files deleted: ${deletedCount}`);
console.log(`⚠️  Files not found: ${notFoundCount}`);
console.log(`❌ Errors: ${errors}`);

console.log('\n📁 Documentation files kept:');
docsToKeep.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  }
});

console.log('\n💡 Recommended next steps:');
console.log('   1. Review the changes');
console.log('   2. Commit to git: git add . && git commit -m "Clean up for deployment"');
console.log('   3. Run: node check-deployment-ready.js');
console.log('   4. Deploy following START_HERE.md\n');

if (errors > 0) {
  console.log('⚠️  Some files could not be deleted. Please review the errors above.\n');
  process.exit(1);
} else {
  console.log('✅ Cleanup complete! Your codebase is ready for deployment.\n');
  process.exit(0);
}
