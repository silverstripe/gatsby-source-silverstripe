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
        classAncestry
        typeAncestry
        contentFields
        link
        hierarchy {
          ancestors {
            uuid
            id
          }
          allAncestors {
            uuid
            id
          }
          parent {
            uuid
            id
          }
          children {
            uuid
            id
          }
          allChildren {
            uuid
            id
          }
          level
        }
        relations {
          type
          ownerType
          childType
          name
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