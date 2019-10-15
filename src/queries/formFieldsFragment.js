const formFieldsFragment = `
fragment FormFieldFields on SilverStripeFormField {
	name
	id
	type
	schemaType
	holderId
	title
	source {
		name
		value
	}
	rightTitle
	extraClass
	description
	rightTitle
	leftTitle
	readOnly
	disabled
	customValidationMessage
	validation
	attributes {
		name
		value
	}
	data
	autoFocus	
}`;

module.exports = formFieldsFragment;
