import express from 'express';
import { client } from '../config/db.js';
import { isAdmin } from '../middlewares/authMiddleware.js';
import { ObjectId } from 'mongodb';
const router = express.Router();

// Dashboard metrics
// Endpoint to fetch metrics for the dashboard
router.get('/dashboard/metrics', async (req, res) => {
    try {
      const database = client.db('e_store');
      const users = database.collection('users');
      const orders = database.collection('orders');
      const products = database.collection('products');
  
      // Count the number of active users
      const activeUsers = await users.countDocuments({ active: true });
  
      // Calculate the total sales
      const totalSalesResult = await orders.aggregate([
        { $group: { _id: null, totalSales: { $sum: '$total_price' } } }
      ]).toArray();
      const totalSales = totalSalesResult[0]?.totalSales || 0;
  
      // Fetch all reviews and calculate the average rating
      const reviewsResult = await products.aggregate([
        { $unwind: '$reviews' }, // Deconstruct the reviews array
        { $project: { rating: '$reviews.rating' } } // Extract the ratings
      ]).toArray();
  
      // Calculate the average rating from the extracted reviews
      const averageRating =
        reviewsResult.reduce((sum, review) => sum + review.rating, 0) /
          (reviewsResult.length || 1);
  
      // Send the metrics response with review ratings
      res.json({
        activeUsers,
        totalSales,
        averageRating: averageRating.toFixed(1),
        //ratings: reviewsResult.map((review) => review.rating) // Return all review ratings
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ message: 'Error fetching metrics' });
    }
  });

  router.get('/dashboard/top-products', async (req, res) => {
    try {
      const database = client.db('e_store');
      const orders = database.collection('orders');
      const products = database.collection('products');
  
      // Aggregate the top 5 selling products by quantity
      const topProducts = await orders.aggregate([
        {
          $group: {
            _id: '$productId', // Group by product ID
            totalQuantity: { $sum: '$quantity' } // Sum the quantities
          }
        },
        { $sort: { totalQuantity: -1 } }, // Sort by total quantity in descending order
        { $limit: 5 }, // Limit to the top 5 products
        {
          $addFields: {
            productId: { $toObjectId: '$_id' } // Convert _id (productId) to ObjectId
          }
        },
        {
          $lookup: {
            from: 'products', // Join with products collection
            localField: 'productId',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        { $unwind: '$productDetails' }, // Deconstruct productDetails array
        {
          $project: {
            name: '$productDetails.name', // Product name
            value: '$totalQuantity' // Total quantity
          }
        }
      ]).toArray();
  
      res.json(topProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
      res.status(500).json({ message: 'Error fetching top products' });
    }
  });
  
  
  router.get('/dashboard/order-status', async (req, res) => {
    try {
      const database = client.db('e_store');
      const orders = database.collection('orders');
  
      // Aggregate the order statuses
      const result = await orders.aggregate([
        {
          $group: {
            _id: '$status', // Group by the `status` field
            count: { $sum: 1 } // Count the total number of orders for each status
          }
        },
        {
          $project: {
            name: '$_id', // Use the status as the name
            value: '$count' // Use the count as the value
          }
        }
      ]).toArray();
  
      res.json(result); // Send the formatted result
    } catch (error) {
      console.error('Error fetching order status data:', error);
      res.status(500).json({ message: 'Error fetching order status data' });
    }
  });
  
  
  

// Admin API - Add a new product
router.post('/products', isAdmin, async (req, res) => {
    const { name, description, price, image_url } = req.body;
  
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and Price are required fields' });
    }
  
    try {
      const database = client.db('e_store');
      const products = database.collection('products');
      const result = await products.insertOne({ name, description, price, image_url });
  
      res.status(201).json({ message: 'Product added successfully', productId: result.insertedId });
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ message: 'Error adding product', error });
    }
  });
  
  // Update Product API - Admin Only
  router.put('/products/:id', isAdmin, async (req, res) => {
    const productId = req.params.id;
    const updatedProduct = req.body;
  
    try {
      const database = client.db('e_store');
      const products = database.collection('products');
  
      // Exclude the `_id` field from the update payload
      const { _id, ...productData } = updatedProduct;
  
      const result = await products.updateOne(
        { _id: new ObjectId(productId) }, // Match the product by its ID
        { $set: productData } // Update other fields
      );
  
      if (result.modifiedCount === 1) {
        res.status(200).json({ message: 'Product updated successfully' });
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Error updating product', error });
    }
  });
  
 router.delete('/products/:id', isAdmin, async (req, res) => {
    const productId = req.params.id;
  
    try {
      const database = client.db('e_store');
      const products = database.collection('products');
  
      // Attempt to delete the product by its ID
      const result = await products.deleteOne({ _id: new ObjectId(productId) });
  
      if (result.deletedCount === 1) {
        res.status(200).json({ message: 'Product deleted successfully' });
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Error deleting product', error });
    }
  });
  

export default router;
