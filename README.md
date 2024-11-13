# Animal Arts E-Store Backend 🐾🛍️

**Animal Arts** is the backend for an Angular-based e-commerce application focused on pet-themed art products. Built with **Node.js** and **Express**, this project provides a RESTful API for handling product data, user authentication, and order management. It leverages **MongoDB** for data storage, making it scalable and efficient for managing user and product data.

## Overview

The **Animal Arts E-Store Backend** is designed to support a seamless shopping experience, providing endpoints for user registration, authentication, product catalog management, and order processing. The backend is optimized for smooth integration with the Angular frontend, enabling real-time updates and secure data handling.

## Features

- **RESTful API**: A well-structured API with endpoints for product management, user actions, and order processing.
- **User Authentication and Security**: Passwords are hashed with **bcrypt** for secure storage, providing safe and reliable user management.
- **Product and Cart Management**: Supports CRUD operations for products, and personalized cart functionality for authenticated users.
- **Image Management**: Product images are hosted on **AWS S3** for efficient storage and retrieval.
- **Deployed and Scalable**: Hosted on **Vercel**, making it accessible and stable in a live environment.

## Technologies Used

- **Node.js**
- **Express.js**
- **MongoDB**
- **AWS S3** for image storage
- **bcrypt** for password hashing

## Endpoints

- **User Authentication**:

  - `POST /auth/register`: Register a new user with hashed password storage.
  - `POST /auth/login`: Authenticate a user and issue a session token.

- **Product Management**:

  - `GET /products`: Retrieve a list of all products.
  - `GET /products/:id`: Fetch details for a specific product by ID.
  - `POST /products`: Add a new product (admin access only).
  - `PUT /products/:id`: Update product details (admin access only).
  - `DELETE /products/:id`: Delete a product by ID (admin access only).

- **Cart and Orders**:
  - `GET /cart`: Retrieve the current user's cart.
  - `POST /cart/add`: Add a product to the user’s cart.
  - `POST /cart/remove`: Remove a product from the user’s cart.
  - `POST /order/checkout`: Checkout and create an order from the cart.

## Getting Started

To run the project locally, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/benhemoshai/e-store-backend.git
   ```

2. Navigate to the project directory:

   ```bash
   cd animal-arts-backend
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Set up environment variables:

   - Create a `.env` file in the root directory and add your MongoDB URI, AWS S3 credentials, and JWT secret.

5. Start the server:

   ```bash
   npm start
   ```

   The server will run at `http://localhost:3000`.

## Key Learnings

1. **Frontend-Backend Integration**: Developed a RESTful API that integrates seamlessly with the Angular frontend, learning the nuances of API design and client-server interaction.
2. **Deployment**: Learned the process of deploying the backend to **Vercel**, bridging the gap from local development to a live, stable environment.
3. **Data and Image Management**: Implemented **MongoDB** for data storage and **AWS S3** for image hosting, managing scalability and efficiency in handling product and user data.

## Focus on Security and Scalability

- **Password Security**: Passwords are hashed with **bcrypt** to protect user credentials.
- **JWT Authentication**: Ensures secure access to user-specific actions, such as managing carts and orders.
