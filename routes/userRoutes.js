import express from 'express';
import { client } from '../config/db.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { ObjectId } from 'mongodb'; // Import ObjectId

const router = express.Router();

router.get('/auth-check', isAuthenticated, async (req, res) => {
  try {
    //console.log('Session User ID:', req.session.user.id);

    const database = client.db('e_store');
    const users = database.collection('users');

    const user = await users.findOne(
      { _id: new ObjectId(req.session.user.id) }, // Convert session user ID to ObjectId
      { projection: { password: 0 } } // Exclude password
    );

    if (user) {
      //console.log('User found:', user);
      res.status(200).json(user);
    } else {
      //console.log('User not found for ID:', req.session.user.id);
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

export default router;
