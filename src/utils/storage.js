// utils/storage.js
export function saveArguments(pros, cons) {
	localStorage.setItem("pros", JSON.stringify(pros));
	localStorage.setItem("cons", JSON.stringify(cons));
}

export function loadArguments() {
	return {
		pros: JSON.parse(localStorage.getItem("pros")) || [],
		cons: JSON.parse(localStorage.getItem("cons")) || [],
	};
}
