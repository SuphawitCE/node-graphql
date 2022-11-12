const path = require('path');
const fs = require('fs');

const clearImage = (filePath) => {
  console.log({ 'clear-image': filePath });
  filePath = path.join(__dirname, '..', filePath);

  // Delete that file by passing a file path
  fs.unlink(filePath, (error) => {
    console.log({ 'delete-image-file-error': error });
  });
};

exports.clearImage = clearImage;
