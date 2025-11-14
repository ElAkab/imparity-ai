// utils/session.js
import { evaluation } from "./appState.js";

// Retrieves the current ID or creates it if it does not exist.
export function getSessionId() {
	let sessionId = localStorage.getItem("sessionId");

	if (!sessionId) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("sessionId", sessionId);
	}

	return sessionId;
}

// Resets the session (optionally forcing a new ID)
export function resetSession(forceNew = true) {
	let sessions = JSON.parse(localStorage.getItem("sessions") || "{}");

	// Creates a new ID if a new session is forced or if no session exists
	let sessionId = getSessionId();
	if (!sessionId || forceNew) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("sessionId", sessionId);
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

export function loadEvaluation() {
	const stored = localStorage.getItem("evaluation");
	if (stored) {
		const data = JSON.parse(stored);
		evaluation.topic = data.topic || "";
		evaluation.pros = data.pros || [];
		evaluation.cons = data.cons || [];
		evaluation.followUp = data.followUp || [];
		evaluation.messages = data.messages || [];
	}
}

// Deletes all local data
export function clearSessionData() {
	localStorage.removeItem("sessionId");
	localStorage.removeItem("sessions");
	console.log("🧹 All sessions have been deleted from localStorage.");
}
