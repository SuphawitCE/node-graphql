const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schemaAttributes = {
  title: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
};

const schemaOptions = {
  timestamps: true
};

const postSchema = new Schema(schemaAttributes, schemaOptions);

module.exports = mongoose.model('Post', postSchema);
