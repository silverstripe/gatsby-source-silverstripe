const fetch = require('isomorphic-fetch');

let api_key;
let endpoint;

const executeQuery = async (query, variables = {}) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.GATSBY_API_URL,
        'X-Api-Key': api_key,
      },
      body: JSON.stringify({ query, variables }),
    });
    console.log(response);
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
const setApiKey = key => api_key = key;

module.exports = {
	executeQuery,
  setEndpoint,
  setApiKey,
};