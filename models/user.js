const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schemaAttributes = {
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'New user'
  },
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }
  ]
};

const userSchema = new Schema(schemaAttributes);

module.exports = mongoose.model('User', userSchema);
