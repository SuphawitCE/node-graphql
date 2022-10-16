const bcrypt = require('bcryptjs');
const validator = require('validator');

const User = require('../models/user');

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

const resolver = {
  createUser
};

module.exports = resolver;
