// Todo: Add "since" param
const summaryQuery = `
  query {
    sync {
      summary {
        total
        includedClasses {
          className
          shortName
          fields
        }
      }
    }
  }
`;

module.exports = summaryQuery;