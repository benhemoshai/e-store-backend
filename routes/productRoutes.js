import express from 'express';
import { client } from '../config/db.js';
import { ObjectId } from 'mongodb';

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

  // Reviews API - Add a new review to a specific product
router.post('/:id/reviews', async (req, res) => {
    const productId = req.params.id; // Get the product ID from the URL parameters
    const { name,rating, comment } = req.body; // Destructure the review data
    const date = new Date(); // Get the current date
  
    try {
        const database = client.db('e_store'); // Connect to the database
        const products = database.collection('products'); // Get the products collection
  
        // Update the product document to add the review
        const result = await products.updateOne(
            { _id: new ObjectId(productId) }, // Find the product by ID
            { $push: { reviews: { name,rating, comment, date } } } // Push the new review into the reviews array
        );
  
        if (result.modifiedCount === 1) {
            res.status(201).json({ message: 'Review added successfully' });
        } else {
            res.status(404).json({ message: 'Product not found' }); // If product not found
        }
    } catch (error) {
        console.error('Error adding review:', error); // Log the error for debugging
        res.status(500).json({ message: 'Error adding review' }); // Return error message
    }
  });
  

export default router;
