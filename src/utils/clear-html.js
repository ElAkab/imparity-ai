// utils/clear-html.js

export function newHTML() {
	const topicField = document.querySelector("#topic-field");
	if (!topicField) return;
	if (topicField.classList.contains("opacity-50", "pointer-events-none"))
		topicField.classList.remove("opacity-50", "pointer-events-none");

	// Vérifie si un input existe déjà
	let oldInput = topicField.querySelector("input");
	let oldBtn = topicField.querySelector("button");

	// Si input ou bouton existent, on les retire
	if (oldInput) oldInput.remove();
	if (oldBtn) oldBtn.remove();

	// New input
	const topicInput = document.createElement("input");
	topicInput.type = "text";
	topicInput.id = "topic-input";
	topicInput.placeholder = "Feed my son?";
	topicInput.className =
		"border-2 border-t-blue-900/40 border-black hover:border-black focus:border-2 focus:border-black p-1 px-3.5 rounded-l-lg rounded-r-none transition";

	// New button
	const topicBtn = document.createElement("button");
	topicBtn.id = "topic-btn";
	topicBtn.type = "submit";
	topicBtn.className =
		"bg-linear-to-t from-blue-950 via-black to-red-950 text-white font-bold p-1 px-2.5 rounded-r-lg cursor-pointer hover:text-violet-100 transition";
	topicBtn.textContent = "That's it";

	// Add news éléments
	topicField.append(topicInput, topicBtn);

	// Reset lists | For / Against |
	const forListContainer = document.querySelector("#for-list");
	const againstListContainer = document.querySelector("#against-list");
	if (forListContainer) forListContainer.innerHTML = "";
	if (againstListContainer) againstListContainer.innerHTML = "";

	const forAgainstField = document.querySelector("#for-against-field");
	if (forAgainstField)
		forAgainstField.classList.add("opacity-50", "pointer-events-none");

	const againstField = document.querySelector("#against-section");
	if (!againstField.classList.contains("hidden"))
		againstField.classList.add("hidden");

	const btnField = document.querySelector("#btn-field");
	if (btnField.classList.contains("opacity-50", "pointer-events-none"))
		btnField.classList.remove("opacity-50", "pointer-events-none");

	if (btnField.classList.contains("hidden"))
		btnField.classList.remove("hidden");

	const askBtn = document.querySelector("#ask-btn");
	const hammerIcon = askBtn.querySelector("img");

	if (!askBtn.classList.contains("opacity-50", "pointer-events-none"))
		askBtn.classList.add("opacity-50", "pointer-events-none");

	if (hammerIcon.classList.contains("rotate-90"))
		hammerIcon.classList.remove("rotate-90");

	const newBtn = document.querySelector("#new-btn");
	if (!newBtn.classList.contains("opacity-50", "pointer-events-none"))
		newBtn.classList.add("opacity-50", "pointer-events-none");

	// Clear the chat
	const chatContainer = document.getElementById("ai-chat-container");
	if (!chatContainer.classList.contains("hidden"))
		chatContainer.classList.add("hidden");

	const userResponse = document.getElementById("user-response");
	if (userResponse) userResponse.innerHTML = "";
}
