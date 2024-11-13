import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// User Registration API
router.post('/register', async (req, res) => {
  const { userName, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    const users = getDatabase().collection('users');
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { userName, email, password: hashedPassword };
    const result = await users.insertOne(newUser);

    res.status(201).json({ message: 'User registered successfully', userId: result.insertedId, userName: newUser.userName });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User Login API
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const users = getDatabase().collection('users');
    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    res.status(200).json({ message: 'Login successful', userId: user._id, userName: user.userName });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user' });
  }
});

export default router;
