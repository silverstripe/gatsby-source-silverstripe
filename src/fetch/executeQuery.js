const fetch = require('isomorphic-fetch');

let endpoint;

const executeQuery = async (query, variables = {}) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.GATSBY_API_URL,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await response.json();
    if (json.errors && json.errors.length) {
    	console.error(json.errors);
    	throw new Error(`There was an error executing the GraphQL query`);
    }
    return json;
  } catch (e) {
  	console.log('query:', query);
  	console.log('variables:', variables);
    console.error(e);
  }
};

const setEndpoint = url => endpoint = url;

module.exports = {
	executeQuery,
	setEndpoint,
};