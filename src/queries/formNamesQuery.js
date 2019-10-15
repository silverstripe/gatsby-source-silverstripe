const formsNamesQuery = `
query {
  __type(name: "FormName") {
    enumValues {
      name
    }
  }
}`

module.exports = formsNamesQuery;