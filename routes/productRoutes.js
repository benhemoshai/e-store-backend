import express from 'express';
import { getDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Fetch all products
router.get('/', async (req, res) => {
  try {
    const products = getDatabase().collection('products');
    const productList = await products.find({}).toArray();
    res.json(productList);
  } catch (error) {
    res.status(500).json({ message: 'Error reading products data' });
  }
});

// Fetch single product by ID
router.get('/:id', async (req, res) => {
  try {
    const products = getDatabase().collection('products');
    const product = await products.findOne({ _id: new ObjectId(req.params.id) });
    product ? res.json(product) : res.status(404).json({ message: 'Product not found' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product' });
  }
});

export default router;
