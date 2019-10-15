const _ = require(`lodash`);
const fetchFormData = require('../fetch/fetchFormData');

const buildForms = async ({
  createNodeId,
  createContentDigest,
  actions,
}) => {
	const { createNode } = actions;
	const forms = await fetchFormData();
	forms.forEach(form => {
	const { schema, state } = form.data.Form;
	const { id, action } = schema;
	// not guaranteed unique, but hard to imagine it wouldn't be.  	
	const formID = createNodeId(`${id}${action}`);
	const formNode = {
		...form.data.Form.schema,
		internal: {
			type: 'SilverStripeForm',
		},
		id: formID,
		formFields___NODE: [],
		formActions___NODE: [],
	};
	formNode.internal.contentDigest = createContentDigest(formNode);

	// "fields" is a reserved property, so use formFields, formActions.
	delete formNode.fields;
	delete formNode.actions;

	const fieldCreator = (parent) => (field) => {
		const childFields = field.children;
		const fieldNode = {
			...field,
			internal: {
				type: 'SilverStripeFormField',
			},
			id: createNodeId(`${formID}${field.id}`),
			formFieldID: field.id,
			childFields___NODE: [],
			attributes___NODE: [],
			source___NODE: [],
		};
		const stateField = state.fields.find(f => f.name === field.name);
		if (stateField) {
			fieldNode.value = stateField.value || '';
		}
		['attributes', 'source'].forEach(key => {
			// This is ridiculous. Gatsby ignores empty fields, and statically generated fragments
			// depend on them existing.
			if (!Array.isArray(field[key])) {
				field[key] = [{ name: '', value: '' }];
			}
			field[key].forEach(att => {
				const attNode = {
					...att,
					internal: {
						type: 'SilverStripeFormAttribute',
					},
					id: createNodeId(`${formID}${field.id}${att.name}`),
				};
				attNode.internal.contentDigest = createContentDigest(attNode);
				createNode(attNode);
				fieldNode[`${key}___NODE`].push(attNode.id);
			});
		});

		fieldNode.internal.contentDigest = createContentDigest(fieldNode);

		delete fieldNode.children;
		delete fieldNode.attributes;
		delete fieldNode.source;

		createNode(fieldNode);
		parent.push(fieldNode.id);
		childFields && childFields.forEach(
			fieldCreator(fieldNode.childFields___NODE)
		);
	};
	schema.fields.forEach(
		fieldCreator(formNode.formFields___NODE)
	);
	schema.actions.forEach(
		fieldCreator(formNode.formActions___NODE)
	);

	createNode(formNode);

	})
};

module.exports = buildForms;
