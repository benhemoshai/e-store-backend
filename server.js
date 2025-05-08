import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { sessionConfig } from './config/sessionConfig.js';
import { connectToMongoDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

app.use(bodyParser.json()); // You can keep this or use express.json() instead

app.use(sessionConfig); // ✅ Session must come AFTER CORS and BEFORE routes!


// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/admin', adminRoutes);

// Connect to MongoDB and start the server
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
