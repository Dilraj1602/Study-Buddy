const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ oauthId: profile.id, oauthProvider: 'google' });

        if (user) {
          // User exists, return them
          return done(null, user);
        }

        // Check if user exists with this email (for linking accounts)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // User exists with same email, link Google account
          user.oauthProvider = 'google';
          user.oauthId = profile.id;
          user.profilePicture = profile.photos[0]?.value || '';
          user.oauthAccessToken = accessToken;
          user.oauthRefreshToken = refreshToken;
          user.isEmailVerified = true; // Auto-verify Google emails

          // Add to linked accounts if not already there
          const alreadyLinked = user.linkedAccounts.some(acc => acc.provider === 'google' && acc.providerId === profile.id);
          if (!alreadyLinked) {
            user.linkedAccounts.push({
              provider: 'google',
              providerId: profile.id,
            });
          }

          await user.save();
          return done(null, user);
        }

        // Create new user with Google OAuth
        const newUser = new User({
          firstName: profile.name.givenName || '',
          lastName: profile.name.familyName || '',
          email: profile.emails[0].value,
          oauthProvider: 'google',
          oauthId: profile.id,
          profilePicture: profile.photos[0]?.value || '',
          oauthAccessToken: accessToken,
          oauthRefreshToken: refreshToken,
          isEmailVerified: true, // Auto-verify emails from Google
          linkedAccounts: [{
            provider: 'google',
            providerId: profile.id,
          }],
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
