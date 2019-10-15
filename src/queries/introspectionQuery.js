const introspectionQuery = `
  query {
    __schema {
      types {
        name
        fields {
          name
        }
      }
    }
  }
`;

module.exports = introspectionQuery;