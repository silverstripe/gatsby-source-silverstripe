// todo: add "Since" param
const syncQuery = `
query Sync($Limit:Int!, $Token:String) {
  sync {
    results(limit: $Limit, offsetToken: $Token) {
      offsetToken
      nodes {
        id
        parentUUID
        uuid
        created
        lastEdited
        className
        ancestry
        contentFields
        link
        relations {
          type
          name
          ownerType
          records {
            className
            id
            uuid
          }
        }
      }
    }
  }
}`;

module.exports = syncQuery;