// sessionHistory.js
import { getSessionId } from "./session.js";

// Récupère toutes les sessions du localStorage
export function loadAllSessions() {
	return JSON.parse(localStorage.getItem("sessions") || "{}");
}

// Affiche l’historique dans la modale
export function renderHistory(renderArguments, renderMessages) {
	const historyContainer = document.getElementById("history-list");
	if (!historyContainer) return;

	historyContainer.innerHTML = ""; // reset

	const sessions = loadAllSessions();

	Object.entries(sessions).forEach(([sessionId, sessionData]) => {
		const div = document.createElement("div");
		div.textContent = sessionData.topic || "Session sans titre";
		div.className =
			"bg-indigo-400/40 hover:bg-indigo-500/60 cursor-pointer p-2 rounded transition";

		div.addEventListener("click", () => {
			loadSession(sessionId, renderArguments, renderMessages);
		});

		historyContainer.appendChild(div);
	});
}

// Charge une session spécifique
export function loadSession(sessionId, renderArguments, renderMessages) {
	const sessions = loadAllSessions();
	const sessionData = sessions[sessionId];
	if (!sessionData) return alert("Session introuvable");

	document.getElementById("topic-input").value = sessionData.topic || "";
	renderArguments(sessionData.pros, sessionData.cons);
	renderMessages(sessionData.messages);
}

// Sauvegarde la session actuelle
export function saveSession(getProsFromUI, getConsFromUI, getMessagesFromUI) {
	const sessionId = getSessionId();
	const sessions = loadAllSessions();

	const sessionData = {
		topic: document.getElementById("topic-input").value,
		pros: getProsFromUI(),
		cons: getConsFromUI(),
		messages: getMessagesFromUI(),
	};

	sessions[sessionId] = sessionData;
	localStorage.setItem("sessions", JSON.stringify(sessions));

	// Met à jour la liste visible dans la modale
	renderHistory(getProsFromUI, getMessagesFromUI);
}
