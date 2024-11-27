import express from 'express';
import bcrypt from 'bcryptjs';
import { client } from '../config/db.js';

const router = express.Router();

// Register API
router.post('/register', async (req, res) => {
  const { userName, email, password, role = 'user' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const database = client.db('e_store');
    const users = database.collection('users');

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { userName, email, password: hashedPassword, role, active: true };

    const result = await users.insertOne(newUser);

    req.session.user = { id: result.insertedId, userName, role };
    res.status(201).json({ user: { id: result.insertedId, userName, email, role, active: true } });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login API
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const database = client.db('e_store');
    const users = database.collection('users');

    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    req.session.user = { id: user._id, role: user.role };
    console.log('Session after login:', req.session);
    req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Error saving session' });
        }
        res.status(200).json({ message: 'Login successful', role: user.role });
      });
    //res.status(200).json({ message: 'Login successful', role: user.role });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user' });
  }
});

// Logout API
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default router;
