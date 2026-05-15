const authService = require('../services/authService');

const requireAuth = async (req, res, next) => {
  // Only enforce auth for non-GET requests (POST, PUT, DELETE)
  if (req.method === 'GET') {
    return next();
  }

  // Also skip auth for specific public POST/PUT endpoints
  const publicPaths = [
    '/auth/verify',
    '/subscribe',
    '/unsubscribe',
    '/expenses', // Allow adding expenses
    '/expenses/bulk', // Allow adding bulk expenses
    '/milk', // Allow milk routes
    '/milk/fill-zero'
  ];

  // Check if it's a public path for POST/PUT (but not DELETE)
  if (req.method !== 'DELETE' && (publicPaths.includes(req.path) || req.path.startsWith('/milk/'))) {
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
