const { buildSchema } = require('graphql');

//  Define GraphQL Schema
const schemaAttributes = `
  type TestData {
    text: String!
    views: Int!
  }
  type RootQuery {
    hello: TestData!
  }
  schema {
    query: RootQuery
  }
`;

module.exports = buildSchema(schemaAttributes);
