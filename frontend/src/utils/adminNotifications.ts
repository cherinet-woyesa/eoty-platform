/**
 * Admin Notifications Utility
 * Centralized notification system for admin actions
 * Replaces console.log statements with professional toast notifications
 */

import { toast } from 'react-hot-toast';

export const adminNotifications = {
    // User Management Notifications
    user: {
        created: (userName: string) => {
            toast.success(`User "${userName}" created successfully`);
        },
        updated: (userName: string) => {
            toast.success(`User "${userName}" updated successfully`);
        },
        deleted: (userName: string) => {
            toast.success(`User "${userName}" deleted successfully`);
        },
        statusChanged: (userName: string, isActive: boolean) => {
            toast.success(`User "${userName}" ${isActive ? 'activated' : 'deactivated'}`);
        },
        roleChanged: (userName: string, newRole: string) => {
            toast.success(`User "${userName}" role changed to ${newRole}`);
        },
        bulkAction: (action: string, count: number) => {
            toast.success(`${action} applied to ${count} user(s)`);
        },
        error: (message: string) => {
            toast.error(`User operation failed: ${message}`);
        }
    },

    // Chapter Management Notifications
    chapter: {
        created: (chapterName: string) => {
            toast.success(`Chapter "${chapterName}" created successfully`);
        },
        updated: (chapterName: string) => {
            toast.success(`Chapter "${chapterName}" updated successfully`);
        },
        deleted: (chapterName: string) => {
            toast.success(`Chapter "${chapterName}" deleted successfully`);
        },
        statusChanged: (chapterName: string, isActive: boolean) => {
            toast.success(`Chapter "${chapterName}" ${isActive ? 'activated' : 'deactivated'}`);
        },
        bulkAction: (action: string, count: number) => {
            toast.success(`${action} applied to ${count} chapter(s)`);
        },
        error: (message: string) => {
            toast.error(`Chapter operation failed: ${message}`);
        }
    },

    // Role & Permission Notifications
    role: {
        assigned: (userName: string, role: string, chapterName?: string) => {
            const location = chapterName ? ` in ${chapterName}` : '';
            toast.success(`Role "${role}" assigned to ${userName}${location}`);
        },
        removed: (userName: string, role: string, chapterName?: string) => {
            const location = chapterName ? ` from ${chapterName}` : '';
            toast.success(`Role "${role}" removed from ${userName}${location}`);
        },
        permissionToggled: (role: string, permission: string, enabled: boolean) => {
            toast.success(`Permission "${permission}" ${enabled ? 'enabled' : 'disabled'} for ${role}`);
        },
        error: (message: string) => {
            toast.error(`Role operation failed: ${message}`);
        }
    },

    // Content Management Notifications
    content: {
        approved: (contentTitle: string) => {
            toast.success(`Content "${contentTitle}" approved`);
        },
        rejected: (contentTitle: string) => {
            toast.success(`Content "${contentTitle}" rejected`);
        },
        deleted: (contentTitle: string) => {
            toast.success(`Content "${contentTitle}" deleted`);
        },
        error: (message: string) => {
            toast.error(`Content operation failed: ${message}`);
        }
    },

    // System Notifications
    system: {
        dataRefreshed: () => {
            toast.success('Data refreshed successfully');
        },
        exportStarted: (type: string) => {
            toast.loading(`Exporting ${type}...`, { duration: 2000 });
        },
        exportCompleted: (type: string) => {
            toast.success(`${type} exported successfully`);
        },
        error: (message: string) => {
            toast.error(message);
        },
        warning: (message: string) => {
            toast(message, {
                icon: '⚠️',
                duration: 4000,
            });
        },
        info: (message: string) => {
            toast(message, {
                icon: 'ℹ️',
                duration: 3000,
            });
        }
    },

    // Generic notifications
    success: (message: string) => {
        toast.success(message);
    },
    error: (message: string) => {
        toast.error(message);
    },
    loading: (message: string) => {
        return toast.loading(message);
    },
    dismiss: (toastId: string) => {
        toast.dismiss(toastId);
    }
};

// Development-only logging (can be disabled in production)
export const devLog = {
    action: (component: string, action: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${component}] ${action}`, data || '');
        }
    },
    error: (component: string, error: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.error(`[${component}] Error:`, error);
        }
    },
    warn: (component: string, message: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[${component}] Warning:`, message);
        }
    }
};
