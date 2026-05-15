const authService = require('../services/authService');

const requireAuth = async (req, res, next) => {
  // Only enforce auth for non-GET requests (POST, PUT, DELETE)
  if (req.method === 'GET') {
    return next();
  }

  // Also skip auth for the verify password and notification endpoints if needed
  // But strictly, only /api/auth/verify should be public for POST
  if (req.path === '/auth/verify' || req.path === '/subscribe' || req.path === '/unsubscribe') {
    return next();
  }

  const password = req.headers['x-auth-password'];

  if (!password) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const isValid = await authService.verifyPassword(password);
    if (isValid) {
      next();
    } else {
      res.status(403).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { requireAuth };
