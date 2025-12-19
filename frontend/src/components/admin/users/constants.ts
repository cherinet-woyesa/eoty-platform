// UserManagement Component Constants

export const USER_MANAGEMENT_CONSTANTS = {
    // Debounce timeout for search/filter changes (ms)
    SEARCH_DEBOUNCE_MS: 350,

    // Maximum number of users to export in CSV
    EXPORT_LIMIT: 1000,

    // Default pagination settings
    DEFAULT_PAGE_SIZE: 20,
    DEFAULT_PAGE: 1,

    // Loading states
    LOADING_STATES: {
        CREATE: 'create',
        EDIT: 'edit',
        BULK: 'bulk',
        EXPORT: 'export',
    } as const,

    // Role options
    ROLES: {
        ADMIN: 'admin',
        REGIONAL_COORDINATOR: 'regional_coordinator',
        CHAPTER_ADMIN: 'chapter_admin',
        TEACHER: 'teacher',
        STUDENT: 'student',
    } as const,

    // Status options
    STATUS: {
        ALL: 'all',
        ACTIVE: 'active',
        INACTIVE: 'inactive',
    } as const,
} as const;

export type LoadingState = typeof USER_MANAGEMENT_CONSTANTS.LOADING_STATES[keyof typeof USER_MANAGEMENT_CONSTANTS.LOADING_STATES];
export type UserRole = typeof USER_MANAGEMENT_CONSTANTS.ROLES[keyof typeof USER_MANAGEMENT_CONSTANTS.ROLES];
export type UserStatus = typeof USER_MANAGEMENT_CONSTANTS.STATUS[keyof typeof USER_MANAGEMENT_CONSTANTS.STATUS];
