// utils/enter-listener.js

import { evaluation } from "./appState.js";
import { displayValue } from "./display.js";
// import { saveAllData } from "../main.js";

export function initEnterListeners() {
	const forInput = document.getElementById("for-input");
	const againstInput = document.getElementById("against-input");

	function handleEnter(e, type) {
		if (e.key !== "Enter") return;

		const input = e.target;
		const value = input.value.trim();
		if (!value) return;

		const id = Date.now() + Math.random();

		if (type === "pros") {
			evaluation.pros.push({ id, text: value });
			displayValue(
				{ id, text: value },
				document.getElementById("for-list"),
				"pros"
			);
		} else {
			evaluation.cons.push({ id, text: value });
			displayValue(
				{ id, text: value },
				document.getElementById("against-list"),
				"cons"
			);
		}

		input.value = "";
		input.focus();
		// saveAllData();
	}

	if (forInput) {
		forInput.addEventListener("keydown", (e) => handleEnter(e, "pros"));
	}
	if (againstInput) {
		againstInput.addEventListener("keydown", (e) => handleEnter(e, "cons"));
	}
}
