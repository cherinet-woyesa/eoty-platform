# Test Credentials for Login Testing

## Available Test Users

### 1. Student Account
- **Email:** `student@eoty.org`
- **Password:** `Test123!`
- **Role:** student
- **User ID:** 1
- **Name:** Student User

### 2. Teacher Account
- **Email:** `teacher@eoty.org`
- **Password:** `Teacher123!`
- **Role:** teacher
- **User ID:** 2
- **Name:** Teacher User

### 3. Platform Admin Account
- **Email:** `admin@eoty.org`
- **Password:** `Admin123!`
- **Role:** platform_admin
- **User ID:** 4
- **Name:** Platform Admin

### 4. Chapter Admin Account
- **Email:** `chapter-admin@eoty.org`
- **Password:** (not set yet)
- **Role:** chapter_admin
- **User ID:** 3
- **Name:** Chapter Admin

## Other Users in Database

### Personal Test Accounts
- woyesabizunesh@gmail.com (ID: 10)
- bizunesh@gmail.com (ID: 11)
- cherere@eoty.org (ID: 5)
- wotixe@gmail.com (ID: 6)
- wotixwoyee@gmail.com (ID: 8)
- getawu@gmail.com (ID: 9)

## Testing Instructions

### Test Login Flow
1. Start the backend server: `npm run dev` (in backend folder)
2. Start the frontend: `npm run dev` (in frontend folder)
3. Navigate to login page
4. Use any of the credentials above

### Test Different Roles
- **Student:** Limited access to courses and learning materials
- **Teacher:** Can create and manage courses
- **Platform Admin:** Full system access
- **Chapter Admin:** Manage chapter-specific content

### Test Better Auth Features
- ✅ Email/Password login
- ✅ Session management
- ✅ Password reset flow
- ✅ Email verification (if configured)
- ⏳ Social login (Google OAuth - if configured)

## Setting Additional Test Passwords

To set a password for any user:
```bash
node backend/set-test-password.js <email> <password>
```

Example:
```bash
node backend/set-test-password.js chapter-admin@eoty.org ChapterAdmin123!
```

## Database Info
- Total Users: 10
- All users are active
- User IDs are now TEXT type (Better Auth compatible)
- All foreign key relationships preserved

## Next Steps
1. ✅ Database migration complete
2. ✅ Test credentials set
3. 🔄 Test login functionality
4. 🔄 Verify session persistence
5. 🔄 Test role-based access control
