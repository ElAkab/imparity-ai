// utils/history.js
import { createIcons, icons } from "lucide";
import { getSessionId } from "./session.js";
import { displayValue, handleTopicInput } from "./display.js";
import {
	createAssistantBubble,
	formatText,
	appendUserMessageToUI,
} from "./chat.js";
import { evaluation } from "./appState.js"; // <- on mutera cet objet
import { loadArguments } from "./apiClient.js";

// ========================
// Load all sessions from localStorage
// ========================
export function loadAllSessions() {
	return JSON.parse(localStorage.getItem("sessions") || "{}");
}

export function saveSession(topic, pros, cons, followUp, messages) {
	const sessions = loadAllSessions();
	const sessionId = getSessionId();

	sessions[sessionId] = {
		topic,
		pros,
		cons,
		followUp,
		messages,
		savedAt: Date.now(),
	};

	localStorage.setItem("sessions", JSON.stringify(sessions));
	renderHistory();
}

export function renderHistory() {
	const historyList = document.getElementById("history-list");
	if (!historyList) return;
	if (!loadAllSessions()) return;

	historyList.innerHTML = "";
	const sessions = loadAllSessions();

	Object.entries(sessions).forEach(([id, session]) => {
		const li = document.createElement("li");
		li.className =
			"bg-indigo-400/60 border w-full rounded-3xl cursor-pointer transition p-2.5 px-8 flex justify-between items-center m-1";

		const textSpan = document.createElement("span");
		textSpan.textContent = session.topic || "Session sans titre";
		textSpan.className =
			"flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis";

		const iconSpan = document.createElement("span");
		iconSpan.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
		iconSpan.className = "opacity-0 transition-opacity ml-2";

		iconSpan.addEventListener("click", (e) => {
			e.stopPropagation();
			alert("Fonctionnalité à venir : gestion de la session");
		});

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

	createIcons({ icons });
}

export function loadSession(sessionId) {
	const sessions = loadAllSessions();
	const session = sessions[sessionId];
	if (!session) return alert("Session introuvable");

	// ======================
	// Setup UI Elements
	// ======================
	const forAgainstField = document.querySelector("#for-against-field");
	const newBtn = document.querySelector("#new-btn");
	const chatContainer = document.querySelector("#ai-chat-container");
	const forListContainer = document.getElementById("for-list");
	const againstListContainer = document.getElementById("against-list");

	// Enable fields
	forAgainstField?.classList.remove("opacity-50", "pointer-events-none");
	newBtn?.classList.remove("opacity-50", "pointer-events-none");

	// Clear previous UI lists
	if (forListContainer) forListContainer.innerHTML = "";
	if (againstListContainer) againstListContainer.innerHTML = "";

	// ======================
	// Update evaluation object
	// ======================
	evaluation.topic = session.topic || "";
	evaluation.pros = (session.pros || []).map((p) =>
		typeof p === "string" ? { id: Date.now() + Math.random(), text: p } : p
	);
	evaluation.cons = (session.cons || []).map((c) =>
		typeof c === "string" ? { id: Date.now() + Math.random(), text: c } : c
	);
	evaluation.messages = session.messages || [];
	evaluation.followUp = session.followUp || [];

	// ======================
	// Update DOM lists
	// ======================
	evaluation.pros.forEach((item) =>
		displayValue(item, forListContainer, "pros")
	);
	evaluation.cons.forEach((item) =>
		displayValue(item, againstListContainer, "cons")
	);

	// ======================
	// Display chat if messages exist
	// ======================
	if (evaluation.messages.length > 0) {
		chatContainer?.classList.remove("hidden");

		evaluation.messages.forEach((msg) => {
			const role = msg.sender || msg.role; // compatibilité ancienne session
			if (role === "user") {
				appendUserMessageToUI(msg.text);
			} else if (role === "assistant") {
				const bubble = createAssistantBubble(); // crée une bulle unique
				const msgDiv = document.createElement("div");
				msgDiv.className =
					"bg-linear-to-r from-green-900 via-black to-purple-900 text-white p-3 rounded-xl mb-2 max-w-full break-words";
				msgDiv.style.alignSelf = "flex-start";
				msgDiv.innerHTML = formatText(msg.text);
				bubble.appendChild(msgDiv);
			}
		});
	} else {
		chatContainer?.classList.add("hidden");
	}

	// ======================
	// Apply topic input and hide modal
	// ======================
	handleTopicInput(session.topic);
	document.getElementById("modale-menu")?.classList.add("-translate-x-6/6");
	document.querySelector("#logo-ai")?.classList.remove("invisible");

	// Notify main.js
	window.dispatchEvent(new Event("sessionLoaded"));
}

attachTopicListeners();
function attachTopicListeners() {
	const topicInput = document.getElementById("topic-input");
	const topicBtn = document.getElementById("topic-btn");

	if (!topicInput || !topicBtn) return;

	topicBtn.addEventListener("click", async () => {
		const topicValue = topicInput.value.trim();
		if (!topicValue) return;

		evaluation.topic = topicValue;
		handleTopicInput(topicValue);

		document
			.getElementById("for-against-field")
			.classList.remove("opacity-50", "pointer-events-none");
		document
			.getElementById("new-btn")
			?.classList.remove("opacity-50", "pointer-events-none");

		await saveAllData();
		updateAskBtnState();
	});

	topicInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			topicBtn.click();
		}
	});
}
