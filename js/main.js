/* MAIN.JS */
document.addEventListener("DOMContentLoaded", e => {
	let df = document.querySelector("date-field");

	document.querySelector(".change-label").addEventListener("click", e => {
		df.dataset.customLabel = randomString();
	});

	document.querySelector(".set-readonly").addEventListener("click", e => {
		df.dataset.customReadonly = "1";
	});

	document.querySelector(".set-editable").addEventListener("click", e => {
		df.dataset.customReadonly = "0";
	});
});

function randomString() {
	let len = 4 + Math.floor(Math.random() * 20);
	let symbols = [
		"a", "b", "c", "d", "e", " ",
		"f", "g", "h", "i", "j", " ",
		"k", "l", "m", "n", "o", " ",
		"p", "q", "r", "s", "t", " ",
		"u", "v", "w", "x", "y", " ",
		"z", " "
	];

	let s = "";

	for (let i = 0; i < len; i++) {
		s += symbols[Math.floor(Math.random() * symbols.length)];
	}

	return s;
}