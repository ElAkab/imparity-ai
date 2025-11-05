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

// Reset the session by generating a new sessionId
export function resetSession() {
	const sessionId = crypto.randomUUID();
	localStorage.setItem("sessionId", sessionId);
	console.log("Session reset. New Session ID:", sessionId);
	return sessionId;
}

// Helper function to make POST requests with sessionId included
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

// Clear session data from localStorage
export function clearSessionData() {
	localStorage.removeItem("sessionId");
	localStorage.removeItem("sessions");
	console.log("Session data cleared from localStorage.");
}
