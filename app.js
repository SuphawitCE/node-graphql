const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

// import express-graphql
const { graphqlHTTP } = require('express-graphql');

// Import GraphQL schema and resolver
const graphqlScehma = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const { clearImage } = require('./utils/file');

require('dotenv').config();

const app = express();

const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD;

const collectionName = 'messages'; //  MongoDB collection name
const dbURI = `mongodb+srv://${username}:${password}@cluster0.ypnh4.mongodb.net/${collectionName}`; // MongoDB connection URI

// multer file storage configuration
const fileStorage = multer.diskStorage({
  destination(req, file, callBack) {
    callBack(null, 'images');
  },
  filename(req, file, callBack) {
    callBack(null, `${new Date().toISOString()}-${file.originalname}`);
  }
});

// multer file type filter configuration
const fileFilter = (req, file, callBack) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    callBack(null, true);
  } else {
    callBack(null, false);
  }
};

// app.use(bodyParser.urlencoded()); //  x-www-form-urlencoded Use with form <form>
app.use(bodyParser.json()); //  application/json

// Register multer middleware
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));

// Serve static images, register middleware
app.use('/images', express.static(path.join(__dirname, 'images')));

// CORS
app.use((req, res, next) => {
  //  Allow origin and can access all clients using wildcard
  res.setHeader('Access-Control-Allow-Origin', '*');

  //  Allow request method or can use a wildcard to allow all methods
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS',
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
  );

  //  Allow authorization
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // In the express-graphql the 'OPTIONS' request is denied except 'GET' and 'POST'
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Request can now continue and can be handled by our routes
  next();
});

// Register authentication middleware, run every request that reaches graphql endpoint but it won't deny the request if there's no token
app.use(auth);

// GraphQL configuration.
const graphqlConfig = {
  schema: graphqlScehma,
  rootValue: graphqlResolver,
  graphiql: true,
  // GraphQL error handle config
  // formatError(error) { //  Deprecated using customFormatErrorFn instead
  customFormatErrorFn(error) {
    console.log({
      'graphql-format-error': {
        message: error.message,
        originalError: error.originalError
      }
    });

    if (!error.originalError) {
      return error;
    }
    const data = error.originalError.data;
    const message = error.message || 'An error occured';
    const code = error.originalError.code || 500;
    return { message, status: code, data };
  }
};

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not authenticated');
  }

  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!' });
  }

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  const responseData = {
    message: 'File stored',
    filePath: req.file.path
  };

  return res.status(201).json(responseData);
});

// GraphQL register middleware.
app.use('/graphql', graphqlHTTP(graphqlConfig));

// Register error handling middleware
app.use((error, req, res, next) => {
  console.log('app.js-error: ', error);
  const { status, message, data } = error;

  res.status(status || 500).json({ message, data });
});

// Connect to mongoose
mongoose
  .connect(dbURI)
  .then((result) => {
    console.log('Server are running...');
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });
