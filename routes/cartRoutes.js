import express from 'express';
import { getDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Cart API - Get cart items for a specific user
router.get('/cart/:userId', async (req, res) => {
  try {
    const cart = getDatabase().collection('cart');
    const cartItems = await cart.find({ userId: new ObjectId(req.params.userId) }).toArray();
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart items' });
  }
});

// Cart API - Add or update item in the cart
router.post('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  const cartItem = req.body;
  const productId = cartItem.product._id;

  try {
    const cart = getDatabase().collection('cart');
    const existingCartItem = await cart.findOne({ "product._id": productId, userId: new ObjectId(userId) });

    if (existingCartItem) {
      const updatedQuantity = existingCartItem.quantity + cartItem.quantity;
      await cart.updateOne({ "product._id": productId, userId: new ObjectId(userId) }, { $set: { quantity: updatedQuantity } });
      res.status(200).json({ message: 'Quantity updated', id: productId, quantity: updatedQuantity });
    } else {
      cartItem.userId = new ObjectId(userId);
      const result = await cart.insertOne(cartItem);
      res.status(201).json({ message: 'Item added to cart', id: result.insertedId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error adding item to cart' });
  }
});

export default router;
