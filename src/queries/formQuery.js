const formQuery = `
fragment FormFields on FormField {
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
}
query Form($Name: FormName!) {
	Form(name: $Name) {
		schema {
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
			fields {
				...FormFields
				children {
					...FormFields
				}
			}
			actions {
				...FormFields
			}
		}
		state {
			fields {
				name
				value
			}
		}
	}
}
`

module.exports = formQuery;