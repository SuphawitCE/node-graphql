const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../utils/socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  // Configure the pagination, display 2 posts per 1 page
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    // Get total post
    const totalItems = await Post.find().countDocuments();
    // Limit the post per page
    const posts = await Post.find()
      .populate('creator')
      .sort({ created: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // req.body will works cause bodyParser.json()
    console.log('get-post-request: ', totalItems, posts);

    const responseData = {
      message: 'Fetch posts successfully.',
      totalItems,
      posts
    };

    // Send response to client
    res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

// POST method
exports.createPost = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;
    }

    if (!req.file) {
      const error = new Error('No image provided.');
      error.statusCode = 422;
      throw error;
    }

    const imageUrl = req.file.path;

    // req.body will works cause bodyParser.json()
    console.log('create-post-request: ', req.body);

    const title = req.body.title;
    const content = req.body.content;

    const post = new Post({
      title,
      content,
      imageUrl: imageUrl,
      creator: req.userId
    });

    // Storing posts in the MongoDB
    const postResult = await post.save();

    //  Users and Get user from MongoDB
    const getUserResult = await User.findById(req.userId);

    // Add new post to user or link post to user
    getUserResult.posts.push(post);

    // Save user with a new post
    await getUserResult.save();

    // Sent data in posts channel real-time
    const ioData = {
      action: 'create',
      post: {
        ...post._doc,
        creator: {
          _id: req.userId,
          name: getUserResult.name
        }
      }
    };
    io.getIO().emit('posts', ioData);

    // Send response to client
    const responseData = {
      message: 'Post created successfully',
      post,
      creator: { _id: getUserResult._id, name: getUserResult.name }
    };

    console.log({
      'connection-posts-and-users': {
        postResult,
        getUserResult,
        responseData
      }
    });

    // Response created post successfully to client-side
    res.status(201).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const getPost = await Post.findById(postId);

    if (!getPost) {
      const error = new Error('Cloud not find post.');
      error.statusCode = 404;
      throw error;
    }

    // Send response to client
    const responseData = {
      message: 'Post fetched. ',
      post: getPost
    };

    res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;
    }

    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;

    let imageUrl = req.body.image;

    if (req.file) {
      imageUrl = req.file.path;
    }

    if (!imageUrl) {
      const error = new Error('No file picked.');
      error.statusCode = 422;
      throw error;
    }

    // Update post action in Database
    const updatePost = await Post.findById(postId).populate('creator');

    console.log({ 'update-post-byId': updatePost });

    if (!updatePost) {
      const error = new Error('Cloud not find post.');
      error.statusCode = 404;
      throw error;
    }

    if (updatePost.creator._id.toString() !== req.userId) {
      const error = new Error('Cannot edit post due to not authorized');
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== updatePost.imageUrl) {
      clearImage(updatePost.imageUrl);
    }

    updatePost.title = title;
    updatePost.imageUrl = imageUrl;
    updatePost.content = content;
    const updatePostResponse = await updatePost.save();

    // Sent data in posts channel real-time, update post real-time once edited
    const ioData = {
      action: 'update',
      post: updatePostResponse
    };
    io.getIO().emit('posts', ioData);

    console.log({ 'update-post-response': updatePostResponse });

    res
      .status(200)
      .json({ message: 'Post updated successfully', post: updatePostResponse });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    // Extract post id from request parameters
    const postId = req.params.postId;

    // Find the post by id to delete
    const getPostId = await Post.findById(postId);

    console.log({ 'get-post-id': getPostId });

    if (!getPostId) {
      const error = new Error('Cloud not find post.');
      error.statusCode = 404;
      throw error;
    }

    if (getPostId.creator.toString() !== req.userId) {
      const error = new Error('Cannot delete post due to not authorized');
      error.statusCode = 403;
      throw error;
    }

    // Check logged in user
    clearImage(getPostId.imageUrl);

    // Delete post in Database
    const deletePostById = await Post.findByIdAndRemove(postId);

    // Get user from Database
    const getUserResult = await User.findById(req.userId);

    // Clear post-user relations
    await getUserResult.posts.pull(postId);

    // Save user attibutes
    await getUserResult.save();

    // Sent data in posts channel real-time
    const ioData = {
      action: 'delete',
      post: postId
    };
    io.getIO().emit('posts', ioData);

    console.log({ 'delete-post-by-id': deletePostById });

    // Send response to client
    const responseData = {
      message: 'Deleted post successfully',
      deletePostById
    };

    res.status(200).json(responseData);
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }

    next(error);
  }
};

const clearImage = (filePath) => {
  console.log({ 'clear-image': filePath });
  filePath = path.join(__dirname, '..', filePath);

  // Delete that file by passing a file path
  fs.unlink(filePath, (error) => {
    console.log({ 'delete-image-file-error': error });
  });
};
