import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MongoStore from 'connect-mongo';

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
app.use(cors({
    origin: 'https://e-store-frontend-pi.vercel.app',
    credentials: true, // Allow cookies to be sent with requests
}));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24, // 1 day
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
      },
    })
);

// Connect to MongoDB
async function connectToMongoDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}


// Middleware to check if user is an admin
function isAdmin(req, res, next) {
    if (req.session?.user?.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
}

function isAuthenticated(req, res, next) {
    if (req.session?.user) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
  }
  
  app.get('/auth-check', async (req, res) => {
    console.log('Session in auth-check:', req.session); // Detailed logging
    
    if (req.session?.user?.id) {
      try {
        const database = client.db('e_store');
        const users = database.collection('users');
  
        // Fetch the full user details from the database
        const user = await users.findOne(
          { _id: new ObjectId(req.session.user.id) }, 
          { projection: { password: 0 } } // Exclude password
        ); 

        if (user) {
          // Explicitly reconstruct the user object to send back
          res.status(200).json({ 
            user: { 
              id: user._id, 
              userName: user.userName, 
              email: user.email, 
              role: user.role 
            } 
          });
        } else {
          // If no user found, explicitly clear the session
          req.session.destroy();
          res.status(401).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error in auth-check:', error);
        req.session.destroy();
        res.status(500).json({ message: 'Error authenticating user' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/register', async (req, res) => {
    const { userName, email, password, role = 'user' } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    try {
      const database = client.db('e_store');
      const users = database.collection('users');
  
      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { userName, email, password: hashedPassword, role };
  
      const result = await users.insertOne(newUser);
  
      // Automatically log in the user
      req.session.user = { id: result.insertedId, userName, role };
  
      res.status(201).json({
        user: { id: result.insertedId, userName, email, role },
        message: 'Registration successful',
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

        // Store user data in the session
        req.session.user = {
            id: user._id,
            role: user.role, // Store the user's role in the session
        };

        console.log('Session after login:', req.session);

        req.session.save((err) => {
          if (err) {
              console.error('Session save error:', err);
              return res.status(500).json({ message: 'Session could not be saved' });
          }
          
          console.log('Session after login:', req.session);
          res.status(200).json({ message: 'Login successful', role: user.role });
      });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});

// User Logout API
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Admin API - Add a new product
app.post('/admin/products', isAdmin, async (req, res) => {
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
app.put('/admin/products/:id', isAdmin, async (req, res) => {
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

app.delete('/admin/products/:id', isAdmin, async (req, res) => {
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



// Cart API - Get cart items for the logged-in user
app.get('/cart', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
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
  app.post('/cart', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
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
  app.put('/cart/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
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
  app.delete('/cart/:id', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
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
  app.delete('/cart', isAuthenticated, async (req, res) => {
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
