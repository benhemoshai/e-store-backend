import express from 'express';
import { client } from '../config/db.js';
import { ObjectId } from 'mongodb';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Fetch all products
router.get('/', async (req, res) => {
  try {
    const database = client.db('e_store');
    const products = database.collection('products');
    const productList = await products.find({}).toArray();
    res.json(productList);
  } catch (error) {
    res.status(500).json({ message: 'Error reading products data' });
  }
});

// Fetch a specific product
router.get('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }
  
      const database = client.db('e_store');
      const products = database.collection('products');
  
      const product = await products.findOne({ _id: new ObjectId(id) });
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      res.status(500).json({ message: 'Error fetching product data' });
    }
  });

  // Reviews API - Get reviews for a specific product
router.get('/:id/reviews', async (req, res) => {
    const productId = req.params.id; // Get the product ID from the URL parameters
  
    try {
        const database = client.db('e_store'); // Connect to the database
        const products = database.collection('products'); // Get the products collection
  
        // Find the product by its ID and project only the reviews field
        const product = await products.findOne(
            { _id: new ObjectId(productId) }, 
            { projection: { reviews: 1 } } // Project only the reviews field
        );
  
        if (product && product.reviews) {
            res.json(product.reviews); // Return the reviews if found
        } else {
            res.status(404).json({ message: 'Product or reviews not found' }); // If product or reviews are not found
        }
    } catch (error) {
        console.error('Error fetching reviews:', error); // Log the error for debugging
        res.status(500).json({ message: 'Error fetching reviews' }); // Return error message
    }
  });

  router.post('/:id/reviews', isAuthenticated, async (req, res) => {
    const productId = req.params.id;
    const { name, rating, comment } = req.body;
    const date = new Date();
  
    try {
      const database = client.db('e_store');
      const users = database.collection('users');
      const products = database.collection('products');
  
      // Ensure user is logged in
      const sessionUser = req.session?.user;
      if (!sessionUser || !sessionUser._id) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }
  
      // Fetch user from DB to get full data including purchasedProducts
      const user = await users.findOne({ _id: new ObjectId(sessionUser._id) });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the product was purchased
      const hasPurchased = user.purchasedProducts?.some(pId =>
        pId.toString() === productId
      );
  
      if (!hasPurchased) {
        return res.status(403).json({ message: 'You can only review products you have purchased.' });
      }
  
      // Add the review
      const result = await products.updateOne(
        { _id: new ObjectId(productId) },
        { $push: { reviews: { name, rating, comment, date } } }
      );
  
      if (result.modifiedCount === 1) {
        res.status(201).json({ message: 'Review added successfully' });
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
  
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ message: 'Error adding review' });
    }
  });

export default router;
