import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; // Import bcrypt for password hashing

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


// Helper function to connect to MongoDB
async function connectToMongoDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}

// User Registration API
app.post('/register', async (req, res) => {
    const { userName, email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const database = client.db('e_store');
        const users = database.collection('users');

        // Check if the user already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const newUser = {
            userName,
            email,
            password: hashedPassword, // Store hashed password
        };

        // Insert the new user into the database
        const result = await users.insertOne(newUser);

        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: result.insertedId, 
            userName: newUser.userName // Use newUser.name instead of result.name
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// User Login API
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const database = client.db('e_store');
        const users = database.collection('users');

        // Find the user by email
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Login successful
        res.status(200).json({ message: 'Login successful', userId: user._id , userName: user.name});
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});

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



// Cart API - Get cart items for a specific user
app.get('/cart/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Fetch cart items for the specific user
        const cartItems = await cart.find({ userId: new ObjectId(userId) }).toArray();
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart items' });
    }
});

// Cart API - Add or update item in the cart for a specific user
app.post('/cart/:userId', async (req, res) => {
    const userId = req.params.userId;
    const cartItem = req.body; // Contains the product and quantity
    const productId = cartItem.product._id;

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Check if the product is already in the user's cart
        const existingCartItem = await cart.findOne({ "product._id": productId, userId: new ObjectId(userId) });

        if (existingCartItem) {
            // Update the quantity if item exists
            const updatedQuantity = existingCartItem.quantity + cartItem.quantity;
            await cart.updateOne(
                { "product._id": productId, userId: new ObjectId(userId) },
                { $set: { quantity: updatedQuantity } }
            );
            res.status(200).json({ message: 'Quantity updated', id: productId, quantity: updatedQuantity });
        } else {
            // Insert the new item if it doesn't exist
            cartItem.userId = new ObjectId(userId); // Add userId to the cart item
            const result = await cart.insertOne(cartItem);
            res.status(201).json({ message: 'Item added to cart', id: result.insertedId });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error adding item to cart' });
    }
});

// Cart API - Update quantity for a specific item in the user's cart
app.put('/cart/:userId/:id', async (req, res) => {
    const { userId, id } = req.params; // id here is product ID
    const updatedCartItem = req.body;

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Update the item quantity in the cart for this user
        const result = await cart.updateOne(
            { "product._id": id, userId: new ObjectId(userId) },
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

// Cart API - Delete specific item from user's cart
app.delete('/cart/:userId/:id', async (req, res) => {
    const { userId, id } = req.params; // id is the product ID

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        const result = await cart.deleteOne({ "product._id": id, userId: new ObjectId(userId) });

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

// Cart API - Clear entire cart for a specific user
app.delete('/cart/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const database = client.db('e_store');
        const cart = database.collection('cart');

        // Delete all items for the user in the cart
        await cart.deleteMany({ userId: new ObjectId(userId) });

        res.status(204).send(); // Send a 204 No Content status
    } catch (error) {
        res.status(500).json({ message: 'Error clearing cart' });
    }
});



// Reviews API - Get reviews for a specific product
app.get('/products/:id/reviews', async (req, res) => {
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
app.post('/products/:id/reviews', async (req, res) => {
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

// Connect to MongoDB and start the server
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(console.error);
