interface DefaultArgs {
  filter: {
    type: string
  }
  sort: {
    type: string
  }
  skip: {
    type: string
  }
  limit: {
    type: string
  }
}

export function createDefaultArgs(typeName: string): DefaultArgs {
  return {
    filter: {
      type: `${typeName}FilterInput`,
    },
    sort: {
      type: `${typeName}SortInput`,
    },
    skip: {
      type: `Int`,
    },
    limit: {
      type: `Int`,
    },
  }
}
