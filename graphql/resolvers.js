const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const post = require('../models/post');

const createUser = async ({ userInput }, req) => {
  console.log({ 'resolver-create-user': userInput });
  const { email, name, password } = userInput;

  try {
    //  Validate input email
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: 'E-mail is invalid.' });
    }

    // Valid input password
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: 'Password must longer than 5 characters' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    //  Get user from Mongo
    const existingUser = await User.findOne({ email });

    //  Check if user is exists
    if (existingUser) {
      const error = new Error('User exists already!');
      throw error;
    }

    //  Hashing password
    const hashedPassword = await bcrypt.hash(password, 12);

    //  Create new user with email, password, name
    const user = new User({
      email,
      password: hashedPassword,
      name
    });

    // Save user
    const createdUser = await user.save();

    // Response
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  } catch (error) {
    throw error;
  }
};

const login = async ({ email, password }) => {
  const getUser = await User.findOne({ email });
  if (!getUser) {
    const error = new Error('User not found');
    error.code = 401;
    throw error;
  }

  // Have a user with email, check the password
  const isEqual = await bcrypt.compare(password, getUser.password);

  if (!isEqual) {
    const error = new Error('Password is incorrect');
    error.code = 401;
    throw error;
  }

  const tokenEncodePayload = {
    userId: getUser._id.toString(),
    email: getUser.email
  };

  const tokenConfig = {
    // Set expire time to 1 hour
    expiresIn: '1h'
  };

  const token = jwt.sign(tokenEncodePayload, 'credential_key', tokenConfig);
  return { token, userId: getUser._id.toString() };
};

const createPost = async ({ postInput }, req) => {
  console.log({ 'create-post-resolver': postInput });

  //  Check if user not authenticated
  if (!req.isAuth) {
    const error = new Error('Not authenticated');
    error.code = 401;
    throw error;
  }

  //  Input validation
  const errors = [];

  try {
    //  Validate title
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid' });
    }
    //  Validate content
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Get user from DB
    const getUser = await User.findById(req.userId);

    // Check if not get a user
    if (!getUser) {
      const error = new Error('Invalid user');
      error.code = 401;
      throw error;
    }

    //  Create post
    const postPayload = {
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: getUser
    };
    const post = new Post(postPayload);

    // Save post into DB
    const createdPost = await post.save();

    //  Connect to add post with user
    getUser.posts.push(createdPost);

    // Save users post
    await getUser.save();

    const userPostFormat = {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    };

    // Add post to users posts
    return userPostFormat;
  } catch (error) {
    throw error;
  }
};

const getPosts = async (args, req) => {
  //  Check if user not authenticated
  if (!req.isAuth) {
    const error = new Error('Not authenticated');
    error.code = 401;
    throw error;
  }

  // Pagination logic
  const getTotalPosts = await Post.find().countDocuments();

  // Get sorted post
  const getPosts = await Post.find()
    .sort({ createdAt: -1 })
    .populate('creator');

  const responseData = {
    posts: getPosts.map((post) => ({
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    })),
    totalPosts: getTotalPosts
  };

  return responseData;
};

const resolver = {
  createUser,
  login,
  createPost,
  getPosts
};

module.exports = resolver;
