import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Define __dirname manually for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static files (images)
app.use('/images', express.static(path.join(__dirname, '/images')));

// Helper function to connect to MongoDB
async function connectToMongoDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}

// Products API - Fetch products from MongoDB
app.get('/products', async (req, res) => {
    try {
        const database = client.db('e_store');
        const products = database.collection('products');
        const productList = await products.find({}).toArray();
        res.json(productList);
    } catch (error) {
        res.status(500).json({ message: 'Error reading products data' });
    }
});



app.get('/products/:id', async (req, res) => {
  const productId = req.params.id; // Get the product ID from the URL parameters
  try {
      const database = client.db('e_store'); // Connect to the database
      const products = database.collection('products'); // Get the products collection
      const product = await products.findOne({ _id: new ObjectId(String(productId)) }); // Convert the product ID to ObjectId
      if (product) {
          res.json(product); // Return the product if found
      } else {
          res.status(404).json({ message: 'Product not found' }); // Return not found message
      }
  } catch (error) {
      console.error('Error fetching product:', error); // Log the error for debugging
      res.status(500).json({ message: 'Error fetching product', error }); // Return error message
  }
});



// Cart API - Get cart items
app.get('/cart', async (req, res) => {
    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Fetch all cart items
        const cartItems = await cart.find({}).toArray();
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart items' });
    }
});

// Cart API - Add item to cart or update quantity if it exists
app.post('/cart', async (req, res) => {
    const cartItem = req.body; // The cart item sent from the frontend
    const productId = cartItem.product._id; // Get the product ID

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Check if the product is already in the cart
        const existingCartItem = await cart.findOne({ "product._id": productId });

        if (existingCartItem) {
            // If the item exists, update the quantity
            const updatedQuantity = existingCartItem.quantity + cartItem.quantity;
            await cart.updateOne(
                { "product._id": productId },
                { $set: { quantity: updatedQuantity } }
            );
            res.status(200).json({ message: 'Quantity updated', id: productId, quantity: updatedQuantity });
        } else {
            // If the item doesn't exist, insert the new cart item
            const result = await cart.insertOne(cartItem);
            res.status(201).json({ message: 'Item added to cart', id: result.insertedId });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error adding item to cart' });
    }
});


app.put('/cart/:id', async (req, res) => {
    const { id } = req.params; // This is now the product ID
    const updatedCartItem = req.body;
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      // Update the cart item in the collection
      const result = await cart.updateOne(
        { "product._id": id }, // Match the product ID in the cart
        { $set: { quantity: updatedCartItem.quantity } } // Update the quantity
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

  app.delete('/cart/:id', async (req, res) => {
    const { id } = req.params; // This is the product ID
  
    try {
      const database = client.db('e_store');
      const cart = database.collection('cart');
  
      const result = await cart.deleteOne({ "product._id": id });
  
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


app.delete('/cart', async (req, res) => {
    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Delete all items from the cart collection
        await cart.deleteMany({});  // This will remove all documents in the collection

        res.status(204).send(); // Send a 204 No Content status
    } catch (error) {
        res.status(500).json({ message: 'Error clearing cart' });
    }
});


// Connect to MongoDB and start the server
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(console.error);
