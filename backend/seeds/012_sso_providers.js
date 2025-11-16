/**
 * FR7: Seed SSO Providers
 * Creates default SSO providers (Google, Facebook)
 * REQUIREMENT: OAuth2, Google, Facebook
 */

exports.seed = async function(knex) {
  // Check if providers already exist
  const existingProviders = await knex('sso_providers').count('* as count').first();
  if (parseInt(existingProviders?.count || 0) > 0) {
    console.log('⚠️  SSO providers already exist, skipping seed');
    return;
  }

  // Insert SSO providers
  // Note: Client IDs and secrets should be set via environment variables in production
  const providers = await knex('sso_providers').insert([
    {
      provider_name: 'google',
      client_id: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: JSON.stringify(['openid', 'profile', 'email']),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      provider_name: 'facebook',
      client_id: process.env.FACEBOOK_APP_ID || 'your-facebook-app-id',
      client_secret: process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret',
      authorization_url: 'https://www.facebook.com/v18.0/dialog/oauth',
      token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      user_info_url: 'https://graph.facebook.com/v18.0/me',
      scopes: JSON.stringify(['email', 'public_profile']),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]).returning('*');

  console.log('✅ SSO providers seeded:', providers.length);
  return providers;
};

