export function isAdmin(req, res, next) {
    if (req.session?.user?.role === 'admin') {
      next();
    } else {
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
  