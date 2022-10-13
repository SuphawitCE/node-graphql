const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error('Signup validation failed.');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    // hashing password and Implement authentication, storing user in the Database
    const hashPassword = await bcrypt.hash(password, 12);

    // User creation with email, password (hashed) name attributes
    const user = new User({
      email,
      password: hashPassword,
      name
    });

    // Save user attribute into Database
    await user.save();

    // Send response to client
    const responseData = { message: 'User created', userId: user._id };
    res.status(201).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  try {
    // Check if user exists in Database
    const getUserResult = await User.findOne({ email });

    if (!getUserResult) {
      const error = new Error('A user with this email could not be found.');
      error.statusCode = 401;
      throw error;
    }

    loadedUser = getUserResult;
    // Validate password
    const isEqual = await bcrypt.compare(password, getUserResult.password);

    if (!isEqual) {
      const error = new Error('User has provided incorrect password.');
      error.statusCode = 401;
      throw error;
    }

    // Generate the JSON Web Token
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString()
      },
      'credentialkey', // Private key
      { expiresIn: '1h' }
    );

    // Send response to client
    const responseData = { token, userId: loadedUser._id.toString() };
    res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    // Check if user exists in Database
    const getUserResult = await User.findById(req.userId);

    console.log({ 'get-user-status': getUserResult });

    if (!getUserResult) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Send response to client
    const responseData = {
      status: getUserResult.status
    };

    res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const newStatus = req.body.status;
    // Check if user exists in Database
    const getUserResult = await User.findById(req.userId);

    if (!getUserResult) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    getUserResult.status = newStatus;

    // Save user attribute into Database
    await getUserResult.save();

    // Send response to client
    const responseData = {
      message: 'User updated status.'
    };

    return res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};
