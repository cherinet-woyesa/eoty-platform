# Google OAuth Diagnostic Test

I cannot programmatically log in to your Google account because that requires your password and 2-factor authentication, which I cannot access.

However, I have verified that your production site is using this Client ID:
`913612347122-vet60c9i0efghtlrn3gnuqoo18jhnr7n.apps.googleusercontent.com`

## The "Truth" Test
Click the link below. This is the **exact** URL your application is trying to generate.

[**👉 CLICK HERE TO TEST GOOGLE LOGIN MANUALLY 👈**](https://accounts.google.com/o/oauth2/v2/auth?client_id=913612347122-vet60c9i0efghtlrn3gnuqoo18jhnr7n.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fwww.eotcommunity.org%2Fauth%2Fgoogle%2Fcallback&scope=openid%20email%20profile&response_type=code&access_type=offline&prompt=consent)

### Interpreting the Result

1.  **If you see the "Access blocked: redirect_uri_mismatch" error:**
    *   Look at the **Client ID** in the error details. Does it match `913612347122...`?
        *   **No?** You are editing the wrong project in Google Cloud Console. Find the project with the ID from the error.
        *   **Yes?** Then `https://www.eotcommunity.org/auth/google/callback` is **definitely not saved** in that specific Client ID's list, or there is a typo (e.g., a space at the end).

2.  **If you see the Google Login screen:**
    *   **Great!** This means your Google Console configuration is correct.
    *   If the app still fails when you click the button on the website, then the website might be generating a slightly different URL (e.g., `http` instead of `https`).

## Checklist for Google Cloud Console
Ensure you are looking at the Client ID that starts with **913612347122**.

**Authorized Redirect URIs:**
- `https://www.eotcommunity.org/auth/google/callback`  <-- MUST BE EXACT
- `https://eotcommunity.org/auth/google/callback`      <-- Add this too just in case
