const resolver = {
  hello() {
    return {
      text: 'Hello world GraphQL',
      views: 1234
    };
  }
};

module.exports = resolver;
