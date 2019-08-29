# gatsby-source-silverstripe

Source plugin for pulling pages, files, and arbitary dataobjects into Gatsby from SilverStripe.
Borrows and implements many key design paradigms of SilverStripe for a familiar
development experience.

## Requirements

* A headless installation of SilverStripe that has the [SilverStripe Gatsby](https://github.com/silverstripe/silverstripe-gatsby) module installed.
* Patience
* Willingness to contribute.

## Install

`npm install --save gatsby-source-silverstripe`

Recommended:

`npm install --save silverstripe-gatsby-helpers`

## Configuration
```
    {
      resolve: 'gatsby-source-silverstripe',
      options: {
        host: 'http://my-headless-cms.local',
      },
    }
```

## Usage

The cornerstone function of this module is the `buildSiteTree` function, 
which creates pages for all provided dataobjects that have a `link` property.
It uses the same ancestry-driven template selection that SilverStripe offers.

*gatsby-node.js*
```
const { buildSiteTree } = require('gatsby-source-silverstripe');

exports.createPages = async ({ graphql, actions }) => {
  buildSiteTree({graphql, actions});
  
  return Promise.resolve();
};
```

The source plugin will autodiscover your page templates and match them to the
content type based on its class name and inheritance. For instance:

```
src/
  templates/
    Page.js <-- your "container" template, providing the chrome
    Layout/
      Page.js
      HomePage.js
      GalleryPage.js
      ContactPage.js
      Blog.js
      BlogPost.js
```

All of these will match their respective (non fully qualified) class names on
each dataobject. If a template doesn't exist, it will look up the inheritance chain.
For instance, `class NewsPage extends Page` will be matched to the `Layout/Page.js` template,
since `Layout/NewsPage.js` does not exist.

Container templates (in `templates/`) are not auto-discovered. You need to import
them explicitly into your layouts. `templates/Page.js` in this example is only
named that way for consistency with traditional SilverStripe projects.


*src/templates/Layout/HomePage.js*
```js
import Page from '../Page';

(props) => (
	<Page>
		<h1>This is the home page</h1>
	</Page>
);
```

## Customising the template choice

You can pass in your own function for template selection.

```js
const { createTemplateChooser } = require('gatsby-source-silverstripe');
const chooseDefault = createTemplateChooser();
const myTemplateChooser = (node) => {
	if (node.className === 'MySpecialClass') {
		return 'special/path/template.js';
	}
	// fallback on autodiscovery
	return chooseDefault(node);
};

exports.createPages = async ({ graphql, actions }) => {
  buildSiteTree({graphql, actions});
  
  return Promise.resolve();
};
```

## Querying data

Data is typed monolithically, under `silverStripeDataObject`. Fields that
are unique to a subclass are assigned to nested fields for their respective
names.

```
query {
	allSilverStripeDataObject {
		# core dataobject fields
		id
		uuid
		link
		created
		lastEdited
		ancestry
		SilverStripeSiteTree {
			title
			showInMenus
			Children {
				link
				# Relationships have to use the same nesting.
				SilverStripeSiteTree {
					title
				}
			}
		}
		ContactUsPage {
			emailTo
		}
	}
}
```

## Next

* Get it working with the Gatsby preview API
* Option to download assets
* Token based auth for viewing draft content


