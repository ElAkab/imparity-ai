// utils/apiClient.js
import { evaluation } from "./appState.js";
// =========================
// Load arguments from backend API
// =========================

export async function loadArguments() {
	const res = (await fetch("/api/arguments")) || evaluation;
	return await res.json();
}

export async function saveArguments(
	topic,
	pros,
	cons,
	followUp,
	messages,
	sessionId
) {
	const res = await fetch("/api/arguments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			sessionId,
			topic,
			pros,
			cons,
			followUp,
			messages,
		}),
	});
	return res.json();
}

export async function clearArguments() {
	const res = await fetch("/api/arguments", {
		method: "DELETE",
	});
	return res.json();
}
