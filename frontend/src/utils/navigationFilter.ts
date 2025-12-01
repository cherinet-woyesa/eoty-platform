import { NavItem, ROLE_HIERARCHY } from '@/config/navigation';

/**
 * Check if a user has the required role to access a navigation item
 * Supports role hierarchy where higher roles can access lower-level items
 * 
 * @param userRole - The user's current role
 * @param requiredRole - The required role(s) for the navigation item
 * @param allowHigher - Whether to allow higher roles to access this item (default: true)
 * @returns boolean indicating if the user has access
 */
export const hasRequiredRole = (
  userRole: string | undefined,
  requiredRole: string | string[] | undefined,
  allowHigher: boolean = true
): boolean => {
  if (!userRole) return false;
  if (!requiredRole) return true; // No role requirement means accessible to all

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Direct role match
  if (requiredRoles.includes(userRole)) {
    return true;
  }

  // Check role hierarchy if allowHigher is true
  if (allowHigher) {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevels = requiredRoles.map(role => ROLE_HIERARCHY[role] || 0);
    
    // If user level is greater than or equal to ANY of the required levels
    // This is more permissive and correct for hierarchy
    return requiredLevels.some(level => userLevel >= level);
  }

  return false;
};

/**
 * Check if a user has the required permission
 * 
 * @param userPermissions - Array of user's permissions
 * @param requiredPermission - The required permission
 * @returns boolean indicating if the user has the permission
 */
export const hasRequiredPermission = (
  userPermissions: string[],
  requiredPermission: string | undefined
): boolean => {
  if (!requiredPermission) return true;
  return userPermissions.includes(requiredPermission);
};

/**
 * Filter navigation items based on user role and permissions
 * Recursively filters nested navigation items
 * Hides parent items when all children are inaccessible
 * 
 * @param items - Array of navigation items to filter
 * @param userRole - The user's current role
 * @param userPermissions - Array of user's permissions
 * @param allowHigher - Whether to allow higher roles to access lower-level items
 * @returns Filtered array of navigation items
 */
export const filterNavItems = (
  items: NavItem[],
  userRole: string | undefined,
  userPermissions: string[] = [],
  allowHigher: boolean = true
): NavItem[] => {
  return items
    .map(item => {
      // Check if user has required role
      const hasRole = hasRequiredRole(userRole, item.requiredRole, allowHigher);
      
      // Check if user has required permission
      const hasPermission = hasRequiredPermission(userPermissions, item.requiredPermission);
      
      // If item has children, filter them recursively
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterNavItems(
          item.children,
          userRole,
          userPermissions,
          allowHigher
        );
        
        // If no children are accessible, hide the parent item
        if (filteredChildren.length === 0) {
          return null;
        }
        
        // Return parent with filtered children
        return {
          ...item,
          children: filteredChildren,
        };
      }
      
      // Return item if user has both required role and permission
      if (hasRole && hasPermission) {
        return item;
      }
      
      return null;
    })
    .filter((item): item is NavItem => item !== null);
};

/**
 * Get navigation items for a specific role
 * Convenience function that filters items based on role
 * 
 * @param items - Array of navigation items
 * @param userRole - The user's current role
 * @param userPermissions - Array of user's permissions
 * @returns Filtered navigation items for the role
 */
export const getNavItemsForRole = (
  items: NavItem[],
  userRole: string | undefined,
  userPermissions: string[] = []
): NavItem[] => {
  return filterNavItems(items, userRole, userPermissions, true);
};

/**
 * Check if a navigation item is accessible to a user
 * 
 * @param item - The navigation item to check
 * @param userRole - The user's current role
 * @param userPermissions - Array of user's permissions
 * @returns boolean indicating if the item is accessible
 */
export const isNavItemAccessible = (
  item: NavItem,
  userRole: string | undefined,
  userPermissions: string[] = []
): boolean => {
  const hasRole = hasRequiredRole(userRole, item.requiredRole, true);
  const hasPermission = hasRequiredPermission(userPermissions, item.requiredPermission);
  
  return hasRole && hasPermission;
};

/**
 * Find a navigation item by href
 * Searches recursively through nested items
 * 
 * @param items - Array of navigation items to search
 * @param href - The href to search for
 * @returns The found navigation item or undefined
 */
export const findNavItemByHref = (
  items: NavItem[],
  href: string
): NavItem | undefined => {
  for (const item of items) {
    if (item.href === href) {
      return item;
    }
    
    if (item.children) {
      const found = findNavItemByHref(item.children, href);
      if (found) {
        return found;
      }
    }
  }
  
  return undefined;
};

/**
 * Get all accessible hrefs for a user
 * Useful for route validation
 * 
 * @param items - Array of navigation items
 * @param userRole - The user's current role
 * @param userPermissions - Array of user's permissions
 * @returns Array of accessible hrefs
 */
export const getAccessibleHrefs = (
  items: NavItem[],
  userRole: string | undefined,
  userPermissions: string[] = []
): string[] => {
  const filteredItems = filterNavItems(items, userRole, userPermissions, true);
  const hrefs: string[] = [];
  
  const extractHrefs = (navItems: NavItem[]) => {
    navItems.forEach(item => {
      hrefs.push(item.href);
      if (item.children) {
        extractHrefs(item.children);
      }
    });
  };
  
  extractHrefs(filteredItems);
  return hrefs;
};
