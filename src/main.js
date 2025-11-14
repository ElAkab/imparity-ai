// =========================
// Imports
// =========================
import { createIcons, icons } from "lucide";
import { checkAuth, logoutUser } from "./utils/token.js";
import { newHTML } from "./utils/clear-html.js";
import { evaluation } from "./utils/appState.js";
import {
	resetSession,
	getSessionId,
	clearSessionData,
	loadEvaluation,
} from "./utils/session.js";
import {
	loadAllSessions,
	renderHistory,
	loadSession,
	saveSession,
} from "./utils/history.js";
import {
	displayValue,
	handleTopicInput,
	updateAskBtnState,
} from "./utils/display.js";
import {
	formatText,
	analyzeWithStream,
	createAssistantBubble,
} from "./utils/chat.js";
import {
	loadArguments,
	saveArguments,
	clearArguments,
} from "./utils/apiClient.js";

// =========================
// Global variables
// =========================
const SESSION_ID = getSessionId();
let userStatus = "public"; // "public", "auth", "premium"

loadEvaluation();
renderHistory(renderArguments, renderMessages);
updateChatUI();

// Check auth and update userStatus
async function initAuth() {
	const authData = await checkAuth();
	if (authData?.loggedIn) {
		userStatus = authData.user.is_premium ? "premium" : "auth";
	}
}
initAuth();

// =========================
// Utilities
// =========================
export function updateChatUI() {
	const chatContainer = document.getElementById("ai-chat-container");
	const userResponse = document.getElementById("user-response");
	if (!chatContainer || !userResponse) return;

	userResponse.innerHTML = "";

	if (!evaluation.messages || evaluation.messages.length === 0) {
		chatContainer.classList.add("hidden");
		return;
	}

	chatContainer.classList.remove("hidden");

	evaluation.messages.forEach((msg) => {
		const div = document.createElement("div");
		if (msg.role === "user") {
			div.className =
				"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-white p-3 rounded-xl mb-2 max-w-full break-words";
			div.textContent = msg.content;
		} else if (msg.role === "assistant") {
			div.className =
				"relative p-3 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-white drop-shadow-md mb-2 max-w-full break-words";
			div.innerHTML = formatText(msg.content);
		}
		userResponse.appendChild(div);
	});
}

// =========================
// History helpers
// =========================
function renderArguments(pros, cons) {
	forListContainer = document.getElementById("for-list");
	againstListContainer = document.getElementById("against-list");
	forListContainer.innerHTML = "";
	againstListContainer.innerHTML = "";
	pros.forEach((p) => displayValue(p, forListContainer, "pros"));
	cons.forEach((c) => displayValue(c, againstListContainer, "cons"));
}
function renderMessages(messages) {
	evaluation.messages = messages || [];
	updateChatUI();
}

// =========================
// Listeners for topic
// =========================
function attachTopicBtnListener() {
	const topicInput = document.getElementById("topic-input");
	const topicBtn = document
		.getElementById("topic-field")
		?.querySelector("button");
	if (!topicInput || !topicBtn) return;
	topicBtn.addEventListener("click", () => {
		const topicValue = topicInput.value.trim();
		if (!topicValue) return;
		evaluation.topic = topicValue;
		handleTopicInput(topicValue);
		document
			.getElementById("for-against-field")
			.classList.remove("opacity-50", "pointer-events-none");
		document
			.getElementById("new-btn")
			.classList.remove("opacity-50", "pointer-events-none");
		saveAllData();
		updateAskBtnState();
	});
	topicInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			topicBtn.click();
		}
	});
}

// =========================
// Save all data (adapté pour public / auth)
// =========================
async function saveAllData() {
	const topic = evaluation.topic || "";
	const pros = Array.isArray(evaluation.pros) ? evaluation.pros : [];
	const cons = Array.isArray(evaluation.cons) ? evaluation.cons : [];
	const followUp = Array.isArray(evaluation.followUp)
		? evaluation.followUp
		: [];
	const messages = Array.isArray(evaluation.messages)
		? evaluation.messages
		: [];

	if (userStatus === "public") {
		// Just save locally
		saveSession(topic, pros, cons, followUp, messages);
	} else {
		try {
			await saveArguments(topic, pros, cons, followUp, messages, SESSION_ID);
			saveSession(topic, pros, cons, followUp, messages);
		} catch (err) {
			console.error("Error during save to backend:", err);
		}
	}
}

// =========================
// Ask button logic (adapté routes)
// =========================
const askBtn = document.getElementById("ask-btn");
const hammerIcon = askBtn?.querySelector("img");

askBtn?.addEventListener("click", async () => {
	saveAllData();

	const btnField = document.querySelector("#btn-field");
	btnField.classList.add("opacity-50", "pointer-events-none");
	hammerIcon.classList.add("rotate-90", "rotate-animation");

	setTimeout(async () => {
		topicInput.classList.add("opacity-50", "pointer-events-none");
		document
			.getElementById("for-against-field")
			.classList.add("opacity-50", "pointer-events-none");

		const payload = {
			topic: evaluation.topic,
			pros: evaluation.pros,
			cons: evaluation.cons,
			followUp: "",
			messages: evaluation.messages,
		};

		if (userStatus === "public") {
			// Non-connected → use public analyze
			const res = await fetch("http://localhost:3000/api/analyze/public", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			evaluation.messages.push({ role: "assistant", content: data.conclusion });
			updateChatUI();
		} else {
			// Authenticated or premium → streaming analyze
			await analyzeWithStream(payload, createAssistantBubble());
		}
	}, 300);

	updateAskBtnState();
});

// =========================
// Initialization
// =========================
createIcons({ icons });
attachTopicBtnListener();
renderHistory(renderArguments, renderMessages);

export { saveAllData };
