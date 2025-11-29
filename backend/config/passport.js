const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const db = require('./database');

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user exists with this Google ID
      let user = await User.findByGoogleId(profile.id);

      if (user) {
        return done(null, user);
      }

      // 2. Check if user exists with this email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        user = await User.findByEmail(email);
        if (user) {
          // Link Google ID to existing user
          await db('users')
            .where({ id: user.id })
            .update({ 
              google_id: profile.id,
              profile_picture: user.profile_picture || (profile.photos && profile.photos[0] ? profile.photos[0].value : null),
              updated_at: new Date()
            });
          return done(null, user);
        }
      }

      // 3. Create new user
      const defaultChapter = await db('chapters')
        .where({ is_active: true })
        .orderBy('id', 'asc')
        .first();

      if (!defaultChapter) {
        return done(new Error('No active chapters found for new user registration'));
      }

      const newUserIds = await db('users').insert({
        first_name: profile.name.givenName,
        last_name: profile.name.familyName,
        email: email,
        google_id: profile.id,
        profile_picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        role: 'user',
        chapter_id: defaultChapter.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      const newUser = await User.findById(newUserIds[0].id || newUserIds[0]);
      return done(null, newUser);

    } catch (err) {
      console.error('Google Auth Error:', err);
      return done(err, null);
    }
  }
));

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'emails', 'name', 'photos'],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await db('users').where({ facebook_id: profile.id }).first();

        if (user) return done(null, user);

        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (email) {
          user = await User.findByEmail(email);
          if (user) {
            await db('users').where({ id: user.id }).update({ facebook_id: profile.id });
            return done(null, user);
          }
        }

        const defaultChapter = await db('chapters').where({ is_active: true }).first();
        
        const newUserIds = await db('users').insert({
          first_name: profile.name.givenName,
          last_name: profile.name.familyName,
          email: email,
          facebook_id: profile.id,
          profile_picture: profile.photos ? profile.photos[0].value : null,
          role: 'user',
          chapter_id: defaultChapter ? defaultChapter.id : 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('id');

        const newUser = await User.findById(newUserIds[0].id || newUserIds[0]);
        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
}

module.exports = passport;
