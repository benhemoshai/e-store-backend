import express from 'express';
import { client } from '../config/db.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { ObjectId } from 'mongodb';

const router = express.Router();


// Cart API - Get cart items for the logged-in user
router.get('/', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user._id;
      const database = client.db('e_store');
      const cart = database.collection('cart');
      const cartItems = await cart.find({ userId: new ObjectId(userId) }).toArray();
      res.json(cartItems);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      res.status(500).json({ message: 'Error fetching cart items' });
    }
  });
  
  // Cart API - Add or update item in the cart for the logged-in user
  router.post('/', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;
    const cartItem = req.body;
    const productId = cartItem.product._id;
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      const existingCartItem = await cart.findOne({
        'product._id': productId,
        userId: new ObjectId(userId),
      });
  
      if (existingCartItem) {
        const updatedQuantity = existingCartItem.quantity + cartItem.quantity;
        await cart.updateOne(
          { 'product._id': productId, userId: new ObjectId(userId) },
          { $set: { quantity: updatedQuantity } }
        );
        res.status(200).json({ message: 'Quantity updated', id: productId, quantity: updatedQuantity });
      } else {
        cartItem.userId = new ObjectId(userId);
        const result = await cart.insertOne(cartItem);
        res.status(201).json({ message: 'Item added to cart', id: result.insertedId });
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({ message: 'Error adding item to cart' });
    }
  });
  
  // Cart API - Update quantity for a specific item in the user's cart
  router.put('/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;
    const { id } = req.params;
    const updatedCartItem = req.body;
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      const result = await cart.updateOne(
        { 'product._id': id, userId: new ObjectId(userId) },
        { $set: { quantity: updatedCartItem.quantity } }
      );
  
      if (result.modifiedCount === 1) {
        res.status(200).json({ message: 'Cart item updated successfully' });
      } else {
        res.status(404).json({ message: 'Cart item not found' });
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Error updating cart item' });
    }
  });
  
  // Cart API - Delete specific item from the user's cart
  router.delete('/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;
    const { id } = req.params;
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      const result = await cart.deleteOne({ 'product._id': id, userId: new ObjectId(userId) });
  
      if (result.deletedCount === 1) {
        res.status(200).json({ message: 'Item removed from cart successfully' });
      } else {
        res.status(404).json({ message: 'Cart item not found' });
      }
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ message: 'Error removing item from cart' });
    }
  });
  
  // Cart API - Clear entire cart for the logged-in user
  router.delete('/', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      await cart.deleteMany({ userId: new ObjectId(userId) });
      res.status(204).send(); // Send a 204 No Content status
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Error clearing cart' });
    }
  });

// Checkout API - Moves items from the cart to orders
router.post('/checkout', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }

      const database = client.db('e_store');
      const cart = database.collection('cart');
      const orders = database.collection('orders');
      const users = database.collection('users');
  
      // Get the user's cart items
      const cartItems = await cart.find({ userId: new ObjectId(userId) }).toArray();
  
      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty. Cannot checkout.' });
      }
      
      // Create orders from cart items
      const orderDocuments = cartItems.map(item => ({
        userId: new ObjectId(userId),
        productId: item.product._id,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
        created_at: new Date(),
        status: 'Pending' // Add the status field with "Pending" value
      }));

      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { purchasedProducts: { $each: orderDocuments.map(item => item.productId) } } }
      );
      
  
      // Insert orders into the orders collection
      await orders.insertMany(orderDocuments);
  
      // Clear the user's cart
      await cart.deleteMany({ userId: new ObjectId(userId) });
  
      res.status(200).json({ message: 'Checkout successful', orders: orderDocuments });
    } catch (error) {
      console.error('Error during checkout:', error);
      res.status(500).json({ message: 'Error during checkout' });
    }
  });
  


export default router;
