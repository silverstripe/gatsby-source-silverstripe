const formFragment = `
fragment FormFields on SilverStripeForm {
	formName
	formPageID
	id
	name
	action
	method
	attributes {
		name
		value
	}
	data	
}`;

module.exports = formFragment;
