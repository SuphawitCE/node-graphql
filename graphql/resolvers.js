const bcrypt = require('bcryptjs');

const User = require('../models/user');

const createUser = async ({ userInput }, req) => {
  // const email = args.userInput.email;
  // const name = args.userInput.name;
  // const password = args.userInput.password;
  const { email, name, password } = userInput;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const error = new Error('User exists already!');
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, name, hashedPassword });

    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  } catch (error) {
    throw error;
  }
};

const resolver = {
  createUser
  // async createUser({ userInput }, req) {
  //   const { email, name, password } = userInput;
  //   try {
  //     const existingUser = await User.findOne({ email });

  //     if (existingUser) {
  //       const error = new Error('User exists already!');
  //       throw error;
  //     }

  //     const hashedPassword = await bcrypt.hash(password, 12);
  //     const user = new User({ email, name, hashedPassword });

  //     const createdUser = await user.save();
  //     return { ...createdUser._doc, _id: createdUser._id.toString() };
  //   } catch (error) {
  //     throw error;
  //   }
  // }
};

module.exports = resolver;
