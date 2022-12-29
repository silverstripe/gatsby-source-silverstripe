# Gatsby source plugin for Silverstripe CMS

This library allows you to pull in Silverstripe CMS content into your Gatsby project. It
maintains a high fidelity to the GraphQL schema that Silverstripe CMS provides using 
the [alpha-release of silverstripe-graphql v4](https://github.com/silverstripe/silverstripe-graphql/tree/master).
It also uses a template inheritance system similar to SSViewer.

## Requirements

You must install the [silverstripe-gatsby](https://github.com/silverstripe/silverstripe-gatsby) module
on your CMS.

## Installation

`$ yarn add gatsby-source-silverstripe`

## Getting started

The best way to get started using this plugin is to use the [gatsby-starter-silverstripe](https://github.com/silverstripe/gatsby-starter-silverstripe) Gatsby starter. It includes a `setup` script that will get
everything configured for you using a default theme.


## Configuration

Example configuration:
```js
    {
      resolve: `gatsby-source-silverstripe`,
      options: {
        baseUrl: process.env.SILVERSTRIPE_CMS_BASE_URL,
        apiKey: process.env.SILVERSTRIPE_CMS_API_KEY,
        stage: process.env.SILVERSTRIPE_STAGE,
        concurrentRequests: 5,
        batchSize: 300,
        templatesPath: `src/templates`
      }
    },
```

There are several options available for configuration:


#### baseUrl

Required. The absolute base URL to your Silverstripe CMS installation, excluding the graphql suburl.
It is recommended that you store this in an environment variable, as it will change depending on where
the project is deployed, e.g. (localhost in dev).

#### apiKey

Required. The API key from your Silverstripe CMS member. Find this in the Security section, on 
the "Api keys" tab for the member you want to use for authentication (should be an administrator).
It is strongly recommended you store this in an environment variable for security.

#### graphqlEndpoint

The pathname to your gatsby graphql server endpoint, e.g. __gatsby/graphql. Defaults to `__gatsby/graphql`.

#### batchSize

The number of records to fetch per network request. Defaults to 100.

#### concurrentRequests

The number of network requests to allow in flight at any given time. Defaults to 5. Values over 30
are likely to crash your server unless they are well provisioned.

Tweaking this setting along with `batchSize` are the primary levers available for speeding up builds.

#### typePrefix

The prefix to apply to all types that come from Silverstripe. Defaults to `SS_`.

#### stage

The stage to read (`DRAFT` | `LIVE`). Defaults to `DRAFT`.

#### templatesPath

The path where your page templates live. 

#### hardCacheAssets

If true, cache the downloaded assets outside the Gatsby cache
directory to prevent them from being redownloaded, even after
clearing the Gatsby cache for a full build. Only works if your
assets are colocated with your CMS instance. Do not use this option
if you host your uploaded assets on a CDN. Defaults to `true`.

## Usage

### Setting up templates

The first thing you'll need to do is add at least one template. The source plugin uses the same
template inheritance pattern as Silverstripe CMS, so it's a good idea to have a `Page.js` file
as your fallback template.


Add a `Page.js` component to `src/templates`.

```jsx
const Page = ({
  data: {
    ssSiteTreeInterface: {
      title,
      content,
    } 
  }
}) => (
  <PageLayout>
    <div className="container"> 
      <SEO title={title} />
      <h1>{title}</h1>      
      <div dangerouslySetInnerHTML={{__html: content }} />
    </div>
  </PageLayout>
);

export const query = graphql`
  query($id: String!) {
    ssSiteTreeInterface( id: {eq: $id }) {
        title
        content
    }
  }
`;

export default Page;

```

Where `PageLayout` is a component with all the wrapper content, e.g. main nav, footer, similar to
your `templates/Page.ss` in Silverstripe CMS.

If you have a page type `HomePage`, you'll also want to create a `src/templates/HomePage.js`, and so on.

### Querying data

The inheritance pattern we use in Sivlerstripe CMS is handled with `interfaces` in the GraphQL API.
When making a polymorphic query, like `readSiteTrees`, you'll need to query the **interface**, and use 
inline fragments to capture fields that are specific to concrete types, like `HomePage.`

```graphql
query {
    allSsSiteTreeInterface {
        nodes {
            title # common to all SiteTree
            link # common to all SiteTree
            ... on SS_HomePage {
                featuredProducts {
                    title
                    price
                }
            }
        }
    }
}
```

This pattern is particularly relevant to the Elemental module (content blocks), where most queries are 
abstractions.

```graphql
query {
    allSsPageInterface {
        nodes {
            title
            elementalArea {
                elements {        
                    id # these fields are common to all SS_BaseElementInterface
                    showTitle              
                    title
                    ... on SS_ElementContent {
                        html # specific to this concrete type
                    }
                }
            }
        }
    }
}
```

In general, if you're quering for a type that *has subclasses*, use the interface. If you're quering for one
specific type, e.g. `HomePage`, use a regular query, like this:

```graphql
query {
    ssHomePage {
        title
        featuredProducts {
            title
            price
        }
    }
}
```

### Dealing with files

Files get special handilng in Gatsby with the `gatsby-source-filesystem` plugin, but we also want to retain
the Silverstripe CMS native `File` object for supporting realted data. For this, a `localFile` field is added
to each Silverstripe `File` type that contains the native Gatsby file, which you can use for image manipulation
and static path access.

```graphql
  query {
    ssProductPage {
        title
        content
        products {
          id
          title
          price
          image {
            localFile {
              childImageSharp {
                gatsbyImageData(width: 200)
              }
            }
          }
        }
    }
  }

```

### Navigation

Navigation is a complex problem to solve, and this is a work in progress. For some example code, see the 
[gatsby-starter-silverstripe](https://github.com/silverstripe/gatsby-starter-silverstripe) package.

## Development

This package is written in typescript. To make changes, run `yarn watch` during development. To publish,
use `yarn format` and `yarn build`.

