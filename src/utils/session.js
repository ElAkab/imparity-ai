// session.js
export function getSessionId() {
	let sessionId = localStorage.getItem("sessionId");
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("sessionId", sessionId);
	}
	console.log("Session ID:", sessionId);
	return sessionId;
}

// Optionnel : reset de la session si tu veux recommencer
export function resetSession() {
	const sessionId = crypto.randomUUID();
	localStorage.setItem("sessionId", sessionId);
	console.log("Session reset. New Session ID:", sessionId);
	return sessionId;
}

// Wrapper pour envoyer les données au backend avec le sessionId
export async function postWithSession(url, data) {
	const sessionId = getSessionId();
	const payload = { ...data, sessionId };

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	console.log("Response status:", res.status);
	return res.json();
}
