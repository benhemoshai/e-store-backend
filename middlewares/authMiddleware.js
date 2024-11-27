export function isAdmin(req, res, next) {
    console.log('Session data in isAdmin:', req.session);
    if (req.session?.user?.role === 'admin') {
      console.log('Admin access granted:', req.session.user); // Log admin details
      next();
    } else {
      console.log('Access denied. Current session:', req.session);
      res.status(403).json({ message: 'Access denied. Admins only.' });
    }
  }
  
  
  export function isAuthenticated(req, res, next) {
    if (req.session?.user) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
  }
  