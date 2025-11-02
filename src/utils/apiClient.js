// utils/apiClient.js
export async function loadArguments() {
	const res = await fetch("http://localhost:3000/api/arguments");
	return await res.json();
}

export async function saveArguments(
	topic,
	pros,
	cons,
	followUp = [],
	messages = []
) {
	const res = await fetch("http://localhost:3000/api/arguments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ topic, pros, cons, followUp, messages }),
	});
	const data = await res.json();
	console.log("Données sauvegardées :", data);
	return data;
}
