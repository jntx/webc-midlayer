// camelize - modified version from vue.js
let camelizeRegEx = /-(\w)/g;
let camelize = function(str) {
	return str.replace(camelizeRegEx, function (_, c) { return c ? c.toUpperCase() : ''; })
}

// hyphenate - modified version from vue.js
let hyphenateRegEx = /\B([A-Z])/g;
let hyphenate = function(str) {
	return str.replace(hyphenateRegEx, '-$1').toLowerCase()
}

let pathRegEx = /\//;
let explodePath = function(str) {
	return str.split(pathRegEx);
}

let customPatternRegEx = /^data\-custom\-/g;

// data attribute pattern - detection and removal
let dataAttributeRegEx = /^data\-/;
let dataAttributeRemoval = function(str) {
	return str.replace(dataAttributeRegEx, "");
}

let customResultValue = function(value) {
	let result = {
		value : value
	};

	return result;
}

let standardBooleanPropertyEvaluator = function(data) {
	return [1, "1", true, "true"].includes(data.newValue);
}


let isUIKey = function(event) {
	return event.ctrlKey || event.altKey || event.metaKey || ["ArrowRight",  "ArrowLeft", "Backspace", "Delete", "Home", "End", "Tab"].includes(event.key);
}

// Mini router per proprietà oggetti: indirizzamento chiave/chiave/.../chiave
let setPathKey = function(context, path, value) {
	var pathComponents = explodePath(path);
	var placeHolder = context;
	
	if (pathComponents.length == 0) {
		return;
	}

	for (let i = 0; i < pathComponents.length - 1; i++) {
		let key = pathComponents[i];

		if (!(key in placeHolder)) {
			placeHolder[key] = {};
		}
		
		placeHolder = placeHolder[key];
	}
	
	placeHolder[pathComponents[pathComponents.length - 1]] = value;
}

var getPathKey = function(context, path) {
	var pathComponents = explodePath(path);
	var placeHolder = context;
	
	if (pathComponents.length == 0) {
		return;
	}

	for (let i = 0; i < pathComponents.length - 1; i++) {
		let key = pathComponents[i];

		if (!(key in placeHolder)) {
			return null;
		}
		
		placeHolder = placeHolder[key];
	}

	let key = pathComponents[pathComponents.length - 1];
	
	return (key in placeHolder) ? placeHolder[key] : null;
}

class CommonElement extends HTMLElement {
	constructor() {
		super();

		let parameters = {
			properties : {},
			elements : {},
			values : {}
		}

		this.customGetParameter = function(parameterPathName) {
			if (pathRegEx.test(parameterPathName)) {
				parameterPathName = parameterPathName.replace(/\/value$/, "");
			}

			return getPathKey(parameters, parameterPathName);
		}

		this.customSetParameter = function(parameterPathName, newValue, computeValue) {
			setPathKey(parameters, parameterPathName, newValue);

			computeValue = [null, undefined].includes(computeValue) ? true : computeValue;

			if (computeValue && /\/value$/.test(parameterPathName)) {
				this.customComputeValue(getPathKey(parameters, parameterPathName.replace(/\/value$/, "")));
			}
		}

		this.dispatchEventToParentDOM = (function(e) {
			let ce = new CustomEvent(e.type, e);

			this.dispatchEvent(ce);
		}).bind(this);

		let shadow = this.attachShadow({ mode : "open" });

		// Plug CSS
		this.customServiceAddStyle();

		// Plug elements
		this.customServiceAddElements();
	}

	customServiceAddStyle() {
		let style = this.customGetStyle();

		if (style !== false) {
			this.shadowRoot.appendChild(style);
		}
	}

	customServiceAddElements() {
		let structure = this.customGetElements();

		if (!("root" in structure)) {
			throw new Error(`Web Component class "${this.constructor.name}" has no root element. Check "customGetElements" for 'root' property in return value.`);
		}

		this.shadowRoot.appendChild(structure.root);

		if (!("items" in structure)) {
			return;
		}

		structure.items.forEach(item => {
			if (item.name) {
				this.customSetParameter("elements/" + item.name, item.handle);
			}

			if (item.handle) {
				item.handle.webcBackReference = this;
			}
		});
	}

	connectedCallback() {
    }

    disconnectedCallback() {
    }

    attributeChangedCallback(name, oldVal, newVal) {
		// Standard attributes
		let propertyName = customPatternRegEx.test(name) ? name.replace(customPatternRegEx, "") : name;
		
		this.customSetParameter("properties/" + propertyName);

		let data = {
			oldValue : oldVal,
			newValue : newVal
		};

		let callbackName = camelize("custom-" + propertyName.toLowerCase() + "-callback");
		
		if (!(callbackName in this)) {
			return;
		}

		this[callbackName](data);
    }

    adoptedCallback() {
	}

	static get observedAttributes() {
		return ["id", "name", "data-custom-default-value", "data-custom-label", "data-custom-required"];
	}

	// custom* methods
	customComputeValue(valuesContext) {
		this.customSetParameter("value", null, false);
	}

	customGetCleanUpValue() {
		return {
			value : null
		}
	}

	customGetElements() {
		return {};
	}

	customGetStyle() {
		return false;
	}

	customDefaultValueCallback(data) {
		if (typeof(data) === "undefined") {
			return this.customGetParameter("properties/label");
		}

		this.customSetParameter("properties/label", data.newValue);
	}

	customLabelCallback(data) {
		if (typeof(data) === "undefined") {
			return this.customGetParameter("properties/label");
		}

		this.customSetParameter("properties/label", data.newValue);

		let label = this.customGetParameter("elements/label");

		if (label) {
			label.innerHTML = data.newValue;
		}
	}

	customRequiredCallback(data) {
		let pathKey = "properties/required";
		let getterMode = typeof(data) === "undefined";
		let result = getterMode ? this.customGetParameter(pathKey) : standardBooleanPropertyEvaluator(data);

		if (getterMode) {
			return result;
		}
		
		this.customSetParameter(pathKey, result);
	}

	// customValue property
	get customValue() {
		let value = this.customGetParameter("values/value");
		
		if (Object.keys(value).length === 0 || !("value" in value)) {
			value.value = null;
		}

		return value;
	}

	set customValue(newVal) {
		if (typeof(newVal) !== "object") {
			newVal = { value : newVal };
		}

		Object.keys(newVal).forEach(keyName => {
			if (keyName === "value") {
				this.customSetParameter("values/" + keyName, newVal[keyName], false);
			} else {
				this.customSetParameter("values/" + keyName, newVal[keyName]);
			}
		})
	}

	// customValidate property
	get customValidate() {
		let value = this.customValue;
		let isValid = value.value !== null;

		if (isValid && this.customRequiredCallback()) {
			isValid = !!value.value;
		}

		return isValid;
	}
}

/**
 * TextField
 * 
 * Componente per testi brevi.
 */
class TextField extends CommonElement {
	constructor() {
		super();

		this.customSetProperty("required", false);
		this.customSetProperty("inputFilterRegEx", "");

		let internalField = this.customGetElement();
		internalField.webcBackReference = this;

		internalField.addEventListener("keypress", this.customOnKeyPress);
		internalField.addEventListener("keyup", this.customOnKeyUp);

		internalField = this.appendChild(internalField);
	}

	customGetElements() {
		let internalField = document.createElement("input");
		internalField.type = "text";

		let key = this.customGetParameter("properties/name");

		return [
			{ name : key, handle : internalField }
		];
	}

	customGetElement() {
		let internalField = document.createElement("input");
		internalField.type = "text";
		
		return internalField;
	}

	customOnKeyPress(e) {
		if (isUIKey(e)) {
			return true;
		}
		
		if (e.target.readOnly) {
			return e.preventDefault() && false;
		}

		let regEx = e.target.webcBackReference.customGetProperty("inputFilterRegEx");

		if (regEx != "") {
			let re = new RegExp(regEx);

			if (!re.test(e.key)) {
				return e.preventDefault() && false;
			}
		}

		return true;
	}
	
	customOnKeyUp(e) {
		e.target.webcBackReference.customValue = e.target.value; // @TODO: va formattato?

		return true;
	}

	get customValue() {
		return super.customValue;
	}

	set customValue(newVal) {
		if (typeof(newVal) !== "object") {
			newVal = new customResultValue(newVal.toString());
	 	} else if (!("value" in newVal)) {
			return;
		}

		this.firstElementChild.value = newVal.value;

		this.customSetProperty("value", newVal);
	}

	get customValidate() {
		let value = this.customValue;
		let isValid = true;

		if (value === "" && !this.customRequired()) {
			isValid = false;
		}

		/*
		if (this.slEnableValidationFeedback()) {
			if (isValid) {
				this.classList.add(this.slSuccessClass());
				this.classList.remove(this.slErrorClass());
			} else {
				this.classList.remove(this.slSuccessClass());
				this.classList.add(this.slErrorClass());
			}
		}
		*/

		return isValid;
	}
}

class LongtextField extends TextField {
	customGetElement() {
		let internalField = document.createElement("textarea");
		
		return internalField;
	}
}

/**
 * DateField
 * 
 * Componente che implementa l'immissione di date
 */

class DateField extends CommonElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return super.observedAttributes.concat(["data-custom-min", "data-custom-max", "data-custom-readonly"]);
	}

	focus() {
		let field = this.customGetParameter("elements/date");

		if (field) {
			field.focus();
		}
	}

	customComputeValue() {
		// this.customSetParameter("values/date", "");
		this.customSetParameter("values/value", null, false);
		// this.customSetParameter("values/timestamp", 0);

		let valid = true;
		let fieldValue = this.customGetParameter("elements/date").value;
		let dateParts = fieldValue.split("/");

		if (dateParts.length != 3) {
			valid = false;
		}

		dateParts.forEach((item, index) => {
			dateParts[index] = +item;

			valid = valid && !isNaN(dateParts[index]);
		});

		let d = new Date(Date.UTC(dateParts[2], dateParts[1] - 1, dateParts[0], 0, 0, 0));

		valid = valid && (d.getFullYear() == dateParts[2]) && (d.getMonth() == dateParts[1] - 1) && (d.getDate() == dateParts[0]);

		let rangeBound = this.customGetParameter("properties/min-ts");
		
		if (rangeBound !== null) {
			valid = valid && d.getTime() >= rangeBound;
		}

		rangeBound = this.customGetParameter("properties/max-ts");
		
		if (rangeBound !== null) {
			valid = valid && d.getTime() <= rangeBound;
		}

		this.customSetParameter("values/date", valid ? fieldValue : null);
		this.customSetParameter("values/value", valid ? fieldValue : null, false);
		// this.customSetParameter("values/rawValue", valid ? fieldValue : null);
		this.customSetParameter("values/timestamp", valid ? d.getTime() : null);
	}

	customGetElements() {
		let internalField = document.createElement("div");
		internalField.classList.add("date");

		let label = this.customLabelCallback();
		label = [null, undefined].includes(label) ? "" : label;

		internalField.innerHTML = `
			<label for="date">${label}</label><input type="text" name="date" id="date" value="" class="field field-date">
		`;

		let input = internalField.querySelector("input");

		input.addEventListener("keypress", function(e) {
			let inputFilterRegEx = /[0-9\/\-]/;
			let field = e.target;

			if (field.readOnly) {
				return e.preventDefault() && false;
			}

			if (isUIKey(e)) {
				return true;
			}
			
			if (!inputFilterRegEx.test(e.key)) {
				return e.preventDefault() && false;
			}

			if (field.value.length >= 10) {
				field.value = "";
			}

			if ([2, 5].includes(field.value.length)) {
				field.value += "/";
			}

			if (["/", "-"].includes(e.key)) {
				return e.preventDefault() && false;
			}

			field.webcBackReference.customSetParameter("values/date", field.value + e.key);
			
			return true;
		});

		input.addEventListener("change", function(e) {
			let valid = true;
			let field = e.target;
			let dateParts = field.value.split("/");
			
			if (field.readOnly) {
				return;
			}

			if (dateParts.length != 3) {
				valid = false;
			}

			dateParts.forEach((item, index) => {
				dateParts[index] = +item;

				valid = valid && !isNaN(dateParts[index]);
			});

			let d = new Date(Date.UTC(dateParts[2], dateParts[1] - 1, dateParts[0], 0, 0, 0));

			valid = valid && (d.getFullYear() == dateParts[2]) && (d.getMonth() == dateParts[1] - 1) && (d.getDate() == dateParts[0]);

			let rangeBound = field.webcBackReference.customGetParameter("properties/min-ts");
			let additionalErrorText = "";
		
			if (rangeBound !== null) {
				let validRange = d.getTime() >= rangeBound;
				valid = valid && validRange;

				additionalErrorText += validRange ? "" : "";
			}
	
			rangeBound = field.webcBackReference.customGetParameter("properties/max-ts");
			
			if (rangeBound !== null) {
				let validRange = d.getTime() <= rangeBound;
				valid = valid && validRange;

				additionalErrorText += validRange ? "" : "";
			}

			if (valid) {
				field.classList.remove("field-error");
			} else {
				field.webcBackReference.customSetParameter("values/date", "");
				field.classList.add("field-error");

				return e.preventDefault() && e.stopPropagation() && false;
			}

			field.value = `${dateParts[0].toString().padStart(2, "0")}/${dateParts[1].toString().padStart(2, "0")}/${dateParts[2].toString()}`;

			field.webcBackReference.customSetParameter("values/date", field.value);
			field.webcBackReference.dispatchEventToParentDOM(e);

			return valid;
		});

		return {
			root : internalField,
			items : [
				{ name : "date", handle : input },
				{ name : "label", handle : internalField.querySelector("label") }
			]
		};
	}

	customGetStyle() {
		let css = `
			:root {
				margin: 0;
			}

			.field, label {
				font-size: 8pt;
			}

			.field {
				box-sizing: border-box;
				min-height: 3em;
				padding: 0.5em;
				width: 100%;
				border: #819150 solid 1px;
				border-radius: 0.3em;
			}

			.field:focus {
				box-shadow: 0px 0px 0.3em 0.1em #005f8e80;
				background-color: #fff;
			}

			.field-readonly, .field-readonly:focus {
				background-color: #ccc;
				cursor: not-allowed;
			}

			.field-error {
				border-color: #a22;
				background-color: #fcc;
			}
		`;

		let internalStyle = document.createElement("style");
		internalStyle.type = "text/css";
		internalStyle.innerHTML = css;

		return internalStyle;
	}

	customReadonlyCallback(data) {
		let pathKey = "properties/readonly";
		let getterMode = typeof(data) === "undefined";
		let result = getterMode ? this.customGetParameter(pathKey) : standardBooleanPropertyEvaluator(data);

		if (getterMode) {
			return result;
		}
		
		this.customSetParameter(pathKey, result);

		let element = this.customGetParameter("elements/date");
		element.readOnly = result;
		
		if (result) {
			element.classList.add("field-readonly");
		} else {
			element.classList.remove("field-readonly");
		}
	}

	customServiceParseRange(rangeString) {
		let d = new Date();
		let dParts = [d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0];
		let referenceTimestamp = d.getTime();
		let dateRegEx = /^\d{4}\-(1[012]|0[1-9])\-\d{2}$/; // ok
		let dateRelativeRegEx = /^[\+\-]\d+ (days|months|years)$/; // ok
		let parts = [];
		let mode = "n/a";

		if (dateRelativeRegEx.test(rangeString)) {
			parts = rangeString.split(/(\+|\-)(\d+)( )(days|months|years)/);
			mode = "rel";
		} else if (dateRegEx.test(rangeString)) {
			parts = rangeString.split(/([0-9]{4})-([0-9]{2})-([0-9]{2})/);
			mode = "abs";
		} else {
		}

		parts = parts.reduce((accumulator, item) => {
			let s = item.trim();
			
			if (!!s) {
				accumulator.push(s);
			}

			return accumulator;
		}, []);

		switch (mode) {
			case "rel":
				let delta = +(parts[0] + parts[1]);
				
				if (parts[2] === "days") {
					dParts[2] += delta;
				} else if (parts[2] === "months") {
					dParts[1] += delta;
				} else if (parts[2] === "years") {
					dParts[0] += delta;
				}

				break;
			case "abs":
				dParts[2] = parts[2];
				dParts[1] = parts[1] - 1;
				dParts[0] = parts[0];

				break;
			case "n/a":
			default:
				break;
		}

		referenceTimestamp = new Date(Date.UTC(dParts[0], dParts[1], dParts[2], dParts[3], dParts[4], dParts[5]));

		return referenceTimestamp.getTime();
	}

	customMinCallback(data) {
		if (typeof(data) === "undefined") {
			return this.customGetParameter("properties/min");
		}

		if ((data.newValue === null) || !data.newValue.trim()) {
			this.customSetParameter("properties/min", null);
			this.customSetParameter("properties/min-ts", null);

			return;	
		}

		let referenceTimestamp = this.customServiceParseRange(data.newValue.toLowerCase());

		this.customSetParameter("properties/min", data.newValue);
		this.customSetParameter("properties/min-ts", referenceTimestamp);
	}

	customMaxCallback(data) {
		if (typeof(data) === "undefined") {
			return this.customGetParameter("properties/max");
		}

		if ((data.newValue === null) || !data.newValue.trim()) {
			this.customSetParameter("properties/max", null);
			this.customSetParameter("properties/max-ts", null);
			
			return;	
		}

		let referenceTimestamp = this.customServiceParseRange(data.newValue.toLowerCase());

		this.customSetParameter("properties/max", data.newValue);
		this.customSetParameter("properties/max-ts", referenceTimestamp);
	}

	get customValue() {
		return super.customValue;
	}

	set customValue(newVal) {
		super.customValue = newVal;

		// Allineamento UI
		if (typeof(newVal) !== "object") {
			return;
		}
		
		let element = this.customGetParameter("elements/date");

		if ("date" in newVal) {
			element.value = [null, undefined].includes(newVal.date) ? "" : newVal.date;
			this.customComputeValue();
			return;
		}
			
		if ("value" in newVal) {
			element.value = [null, undefined].includes(newVal.value) ? "" : newVal.value;
			this.customComputeValue();
			return;
		}
	}
}

// Definizioni (sono sufficenti queste per la visibilità a documento)
customElements.define("text-field", TextField);
customElements.define("longtext-field", LongtextField);
customElements.define("date-field", DateField);

export { CommonElement, TextField, LongtextField, DateField };