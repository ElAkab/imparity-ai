// utils/session.js
import { evaluation } from "./appState.js";

// Retrieves the current ID or creates it if it does not exist.
export function getSessionId() {
	let sessionId = localStorage.getItem("sessionId");

	if (!evaluation.isAuthenticated) {
		// Pas d'utilisateur authentifié, ne rien créer
		return sessionId || null;
	}

	if (!sessionId) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("sessionId", sessionId);
	}

	return sessionId;
}

// Resets the session (optionally forcing a new ID)
export function resetSession(forceNew = true) {
	let sessions = JSON.parse(localStorage.getItem("sessions") || "{}");

	let sessionId = localStorage.getItem("sessionId");

	// // Creates a new ID if a new session is forced or if no session exists
	if (!sessionId || forceNew) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("sessionId", sessionId);
		console.log("New session created :", sessionId);
	} else {
		console.log("Session reset :", sessionId);
	}

	// Reset local state
	evaluation.topic = "";
	evaluation.pros = [];
	evaluation.cons = [];
	evaluation.followUp = [];
	evaluation.messages = [];

	// Saves the empty but independent session
	sessions[sessionId] = {
		topic: "",
		pros: [],
		cons: [],
		followUp: [],
		messages: [],
		savedAt: Date.now(),
	};

	localStorage.setItem("sessions", JSON.stringify(sessions));
	localStorage.setItem("evaluation", JSON.stringify(evaluation));

	return sessionId;
}

// Sending a POST request with the current session
export async function postWithSession(url, data) {
	const sessionId = getSessionId();
	const payload = { ...data, sessionId };

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	console.log("📩 POST sent with sessionId:", sessionId);
	return res.json();
}

// Deletes all local data
export function clearSessionData() {
	localStorage.removeItem("sessionId");
	localStorage.removeItem("sessions");
	console.log("🧹 All sessions have been deleted from localStorage.");
}
