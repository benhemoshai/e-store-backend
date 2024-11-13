import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors'; // Import cors
import * as dotenv from 'dotenv';
import { connectToMongoDB } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware

app.use(bodyParser.json());
app.use(cors()); // Use CORS middleware here

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);

// Connect to MongoDB and start the server
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(console.error);
