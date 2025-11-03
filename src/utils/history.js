// utils/history.js

import { createIcons, icons } from "lucide";
import { getSessionId } from "./session.js"; // fonction pour générer un ID unique
import { displayValue, handleTopicInput } from "./display.js";
import { createAssistantBubble } from "./chat.js";
import { updateAskBtnState } from "../main.js";

// Récupérer toutes les sessions du localStorage
export function loadAllSessions() {
	return JSON.parse(localStorage.getItem("sessions") || "{}");
}

// Sauvegarder une session actuelle
export function saveSession(topic, pros, cons, messages) {
	const sessions = loadAllSessions();
	const sessionId = getSessionId();

	sessions[sessionId] = {
		topic,
		pros,
		cons,
		messages,
		savedAt: Date.now(),
	};

	localStorage.setItem("sessions", JSON.stringify(sessions));
	renderHistory(); // mettre à jour l'affichage
}

// Afficher l'historique dans la modale
export function renderHistory() {
	const historyList = document.getElementById("history-list");
	if (!historyList) return;

	historyList.innerHTML = "";
	const sessions = loadAllSessions();

	Object.entries(sessions).forEach(([id, session]) => {
		const li = document.createElement("li");
		li.className =
			"bg-indigo-400/60 border w-full rounded-3xl cursor-pointer transition p-2.5 px-8 flex justify-between items-center m-1";

		// Texte de la session
		const textSpan = document.createElement("span");
		textSpan.textContent = session.topic || "Session sans titre";
		textSpan.className =
			"flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis";

		// Icône ellipsis, cachée par défaut
		const iconSpan = document.createElement("span");
		iconSpan.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
		iconSpan.className = "opacity-0 transition-opacity ml-2";

		// Afficher l'icône au survol
		li.addEventListener("mouseover", () => {
			iconSpan.classList.remove("opacity-0");
			iconSpan.classList.add("opacity-100");
		});
		li.addEventListener("mouseout", () => {
			iconSpan.classList.remove("opacity-100");
			iconSpan.classList.add("opacity-0");
		});

		li.appendChild(textSpan);
		li.appendChild(iconSpan);
		li.addEventListener("click", () => loadSession(id));

		historyList.appendChild(li);
	});

	// Initialiser les icônes lucide
	createIcons({ icons });
}

// Charger une session spécifique
export function loadSession(sessionId) {
	const sessions = loadAllSessions();
	const session = sessions[sessionId];
	if (!session) return alert("Session introuvable");

	// Apply session data to UI
	handleTopicInput(session.topic);

	// Display and enable input fields and buttons
	const forAgainstField = document.getElementById("for-against-field");
	const newBtn = document.querySelector("#new-btn");
	const askBtn = document.querySelector("#ask-btn");
	forAgainstField.classList.remove("opacity-50", "pointer-events-none");
	newBtn.classList.remove("opacity-50", "pointer-events-none");
	console.log(askBtn.classList);
	askBtn.classList.replace("opacity-50", "opacity-100");
	askBtn.classList.replace("pointer-events-none", "cursor-pointer");
	console.log(askBtn.classList);

	// Pour les pros/cons, tu peux réutiliser tes fonctions displayValue
	const forListContainer = document.getElementById("for-list");
	const againstListContainer = document.getElementById("against-list");
	forListContainer.innerHTML = "";
	againstListContainer.innerHTML = "";

	session.pros.forEach((item) => displayValue(item, forListContainer, "pros"));
	session.cons.forEach((item) =>
		displayValue(item, againstListContainer, "cons")
	);

	// Remplacer l'évaluation globale
	window.evaluation = {
		topic: session.topic,
		pros: session.pros,
		cons: session.cons,
		messages: session.messages,
		followUp: [],
	};

	// display chat messages
	createAssistantBubble();
	session.messages.forEach((msg) => {
		if (msg.sender === "user") {
			appendUserMessageToUI(msg.text);
		} else if (msg.sender === "assistant") {
			// create assistant bubble and append message
			createAssistantBubble();
			// Append assistant message logic here
		}
	});

	// Fermer le menu modal
	document.getElementById("modale-menu").classList.add("-translate-x-6/6");
}
