// utils/display.js

import { createIcons, icons } from "lucide";
import { saveAllData } from "../main.js";
import { evaluation } from "./appState.js";
import { saveArguments } from "./apiClient.js";

// =========================
// Function handleTopicInput (20% AI help)
// =========================
export function handleTopicInput(topicValue) {
	const topicField = document.getElementById("topic-field");
	const topicInput = topicField.querySelector("input");
	const topicBtn = topicField.querySelector("button");

	const pencilIcon = document.createElement("I");
	pencilIcon.classList.add("ml-2");
	pencilIcon.textContent = `<i data-lucide="pencil"></i>`;

	// Create h2 element
	const h2 = document.createElement("h2");
	h2.classList.add(
		"text-2xl",
		"text-indigo-100",
		"p-3",
		"px-6",
		"flex",
		"gap-2",
		"items-center",
		"rounded-xl",
		"font-bold",
		"border-2",
		"border-black",
		"cursor-pointer",
		"bg-gradient-to-tr",
		"from-blue-900",
		"via-black",
		"to-red-900",
		"transition-all",
		"duration-500",
		"ease-in-out"
	);

	h2.innerHTML = `${topicValue}<div class="h-full w-0.5 bg-white mx-2"></div><i data-lucide="pencil" class="-mr-2"></i>`;
	createIcons({ icons });

	// Replace input by h2
	if (topicField.contains(topicInput)) {
		topicField.replaceChild(h2, topicInput);

		createIcons({ icons });
	}

	// Remove button if exists
	if (topicBtn) topicBtn.remove();

	// =========================
	// Click on h2 to edit
	// =========================
	h2.addEventListener("click", () => {
		if (topicField.querySelector("button")) return; // Prevent multiple edits

		let input = document.createElement("input");
		input.type = "text";
		input.value = h2.textContent;
		input.classList.add("border", "rounded", "p-1", "w-full");

		topicField.replaceChild(input, h2);

		let editBtn = document.createElement("button");
		editBtn.classList.add(
			"bg-black",
			"text-white",
			"font-bold",
			"p-1",
			"px-2.5",
			"rounded-r-lg",
			"cursor-pointer",
			"hover:opacity-95",
			"transition"
		);
		editBtn.textContent = "Edit";
		topicField.append(editBtn);
		input.focus();

		let lastTopic = input.value;

		const finishEdit = (() => {
			let finished = false; // empêche les appels multiples
			return () => {
				if (finished) return;
				finished = true;

				if (!topicField.contains(input)) return; // vérifie que l'input est toujours dans le DOM

				h2.innerHTML = `${
					input.value || lastTopic
				}<div class="h-full w-0.5 bg-white mx-2"></div><i data-lucide="pencil" class="-mr-2"></i>`;

				topicField.replaceChild(h2, input);
				editBtn.remove();

				evaluation.topic = h2.textContent;
				createIcons({ icons });
				saveAllData(); // Sauvegarde les données après modification
			};
		})();

		input.addEventListener("blur", finishEdit);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") finishEdit();
		});
	});
}

// =========================
// Function displayValue (45% AI help)
// =========================
export function displayValue(item, container, type) {
	updateAskBtnState();

	const element = document.createElement("li");
	element.classList.add(
		"w-full",
		"flex",
		"justify-between",
		"items-center",
		"pb-2",
		"border-b-2",
		"border-white/20",
		"last:border-b-0"
	);

	element.dataset.id = item.id;

	const text = document.createElement("p");
	text.textContent = item.text;
	text.classList.add("text-center", "flex-1", "break-words");

	const editIcon = document.createElement("span");
	editIcon.innerHTML = '<i data-lucide="pen"></i>';
	editIcon.classList.add(
		"cursor-pointer",
		"text-white",
		"font-bold",
		"sm:hidden"
	);

	const deleteIcon = document.createElement("span");
	deleteIcon.innerHTML = '<i data-lucide="trash-2"></i>';
	deleteIcon.classList.add(
		"cursor-pointer",
		"text-red-600",
		"font-bold",
		"sm:hidden"
	);

	element.append(deleteIcon, text, editIcon);

	element.addEventListener("mouseover", () => {
		element.classList.add("cursor-pointer", "transition");
		editIcon.classList.remove("sm:hidden");
		deleteIcon.classList.remove("sm:hidden");
	});

	element.addEventListener("mouseout", () => {
		element.classList.add("cursor-pointer", "transition");
		editIcon.classList.add("sm:hidden");
		deleteIcon.classList.add("sm:hidden");
	});
	container.append(element);
	createIcons({ icons });

	// =========================
	// Edit Icon
	// =========================
	editIcon.addEventListener("click", () => {
		let finished = false; // 🧩 placé ici pour éviter référence avant initialisation
		let input = document.createElement("input");
		input.type = "text";
		input.value = text.textContent;
		input.classList.add("border", "rounded", "p-1", "w-full");

		element.replaceChild(input, text);
		input.focus();

		const finishEdit = () => {
			if (finished) return;
			finished = true;
			if (!element.contains(input)) return;
			const arr = type === "pros" ? evaluation.pros : evaluation.cons;
			const index = arr.findIndex((el) => el.id === item.id);

			text.textContent = input.value || item.text;
			if (input.value === "") {
				element.remove();
				if (index > -1) arr.splice(index, 1);

				updateAskBtnState();
				return;
			}
			element.replaceChild(text, input);
			if (index > -1) arr[index].text = input.value;
			console.log(arr);
			item.text = input.value;
			saveAllData();
		};

		input.addEventListener("blur", finishEdit);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") finishEdit();
		});
	});

	// =========================
	// Delete Icon
	// =========================
	deleteIcon.addEventListener("click", () => {
		element.remove();
		const arr = type === "pros" ? evaluation.pros : evaluation.cons;
		const index = arr.findIndex((el) => el.id === item.id);
		if (index > -1) arr.splice(index, 1);

		updateAskBtnState();
	});
}

export function updateAskBtnState() {
	const askBtn = document.querySelector("#ask-btn");
	if (!askBtn) return;

	const hasProsCons =
		evaluation.topic &&
		Array.isArray(evaluation.pros) &&
		Array.isArray(evaluation.cons) &&
		evaluation.pros.length > 0 &&
		evaluation.cons.length > 0;

	if (hasProsCons) {
		askBtn.classList.remove("opacity-50", "pointer-events-none");
	} else {
		askBtn.classList.add("opacity-50", "pointer-events-none");
	}
}
