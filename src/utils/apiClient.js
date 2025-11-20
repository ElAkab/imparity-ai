// utils/apiClient.js
import { evaluation } from "./appState.js";

// ======================
// Load Sessions
// ======================
export async function loadSessions() {
	const response = await fetch("/api/arguments", {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		console.log("No sessions here (°_°)/)");
		throw new Error("Failed to load sessions.");
	}

	// Lire le JSON UNE SEULE FOIS
	const data = await response.json();
	// console.log(data); // <-- si tu veux l'afficher, ok
	return data;
}

// ======================
// Save Session (POST / PUT)
// ======================
export async function saveSession(sessionData) {
	const { id, ...data } = sessionData;
	const isUpdating = id !== undefined;

	const url = isUpdating ? `/api/arguments/${id}` : "/api/arguments";
	const method = isUpdating ? "PUT" : "POST";

	const response = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		// Lire l'erreur une seule fois
		const error = await response.json();
		throw new Error(error.message || `Failed to ${method} session.`);
	}

	const result = await response.json();
	return result;
}

// ======================
// Delete one session
// ======================
export async function deleteSession(sessionId) {
	const response = await fetch(`/api/arguments/${sessionId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || `Failed to delete session.`);
	}

	// Lire une seule fois
	const result = await response.json();
	return result;
}

// ======================
// Delete ALL sessions
// ======================
export async function clearAllSessions() {
	const response = await fetch("/api/arguments", {
		method: "DELETE",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to clear sessions");
	}

	const result = await response.json();
	return result;
}
