// =========================
// Imports
// =========================
import { createIcons, icons } from "lucide";
import { evaluation } from "./utils/appState.js";
import {
	postWithSession,
	getSessionId,
	clearSessionData,
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
	appendUserMessageToUI,
} from "./utils/chat.js";
import {
	loadArguments,
	saveArguments,
	clearArguments,
} from "./utils/apiClient.js";

// =========================
// Variables globales
// =========================
const SESSION_ID = getSessionId();
let chatMessages = evaluation.messages || [];

// =========================
// Fonctions utilitaires
// =========================
function updateChatUI() {
	const chatContainer = document.getElementById("ai-chat-container");
	const userResponse = document.getElementById("user-response");
	if (!chatContainer || !userResponse) return;

	userResponse.innerHTML = "";

	if (chatMessages.length === 0) {
		chatContainer.classList.add("hidden");
		return;
	}

	chatContainer.classList.remove("hidden");

	chatMessages.forEach((msg) => {
		const div = document.createElement("div");
		if (msg.role === "user") {
			div.className =
				"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-white p-3 rounded-xl mb-2 max-w-full break-words";
			div.style.alignSelf = "flex-end";
			div.textContent = msg.content;
		} else if (msg.role === "assistant") {
			div.className =
				"relative p-3 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-white drop-shadow-md mb-2 max-w-full break-words";
			div.innerHTML = formatText(msg.content);
		}
		userResponse.appendChild(div);
	});
}

async function saveAllData() {
	const topic = evaluation.topic || "";
	const pros = evaluation.pros.map((p) => p.text);
	const cons = evaluation.cons.map((c) => c.text);
	const followUp = evaluation.followUp.map((f) => f.text || f);
	const messages = chatMessages.map((m) => ({
		role: m.role,
		content: m.content,
	}));

	try {
		await saveArguments(topic, pros, cons, followUp, messages, SESSION_ID);
		saveSession(
			topic,
			evaluation.pros,
			evaluation.cons,
			evaluation.followUp,
			chatMessages
		);
	} catch (err) {
		console.error("Erreur lors de la sauvegarde :", err);
	}
}

async function clear() {
	await clearArguments();
	clearSessionData();
	chatMessages = [];
	evaluation.topic = "";
	evaluation.pros = [];
	evaluation.cons = [];
	evaluation.followUp = [];
	evaluation.messages = [];

	// Reset UI
	document.getElementById("for-list").innerHTML = "";
	document.getElementById("against-list").innerHTML = "";
	document.getElementById("topic-field").innerHTML = `
		<input type="text" id="topic-input" placeholder="Feed my son?" class="border-2 border-gray-600 hover:border-gray-400 p-1 px-3.5 rounded-l-lg transition"/>
		<button id="topic-btn" class="bg-black text-white font-bold p-1 px-2.5 rounded-r-lg cursor-pointer hover:opacity-95 transition">That's it</button>
	`;

	document
		.getElementById("for-against-field")
		.classList.add("opacity-50", "pointer-events-none");
	document
		.getElementById("new-btn")
		.classList.add("opacity-50", "pointer-events-none");

	attachTopicBtnListener();
}

// =========================
// Affichage initial
// =========================
async function displayArguments() {
	try {
		const data = await loadArguments();
		evaluation.topic = data.topic || "";
		evaluation.pros = (data.pros || []).map((text, index) => ({
			id: Date.now() + index,
			text,
		}));
		evaluation.cons = (data.cons || []).map((text, index) => ({
			id: Date.now() + index,
			text,
		}));
		evaluation.followUp = data.followUp || [];
		chatMessages = (data.messages || []).filter(
			(msg) => msg?.role && msg?.content
		);
		evaluation.messages = chatMessages;

		if (evaluation.topic) handleTopicInput(evaluation.topic);
		evaluation.pros.forEach((item) =>
			displayValue(item, document.getElementById("for-list"), "pros")
		);
		evaluation.cons.forEach((item) =>
			displayValue(item, document.getElementById("against-list"), "cons")
		);
		updateChatUI();
		updateAskBtnState();
	} catch (err) {
		console.error("Erreur lors du chargement :", err);
	}
}

// =========================
// Initialisation
// =========================
await displayArguments();
createIcons({ icons });
renderHistory(renderArguments, renderMessages);

// Menu button / menu
let menuBtn = document.querySelector("#menu-btn");
let modalMenu = document.querySelector("#modale-menu");

// Topic
let topicField = document.querySelector("#topic-field");
let topicInput = document.querySelector("#topic-input");
let topicBtn = document.querySelector("#topic-field button");

// For/Against field
const forAgainstField = document.getElementById("for-against-field");

// For queries
const forField = document.getElementById("for-section");
const toAgainstBtn = document.querySelector("#against-btn");
const forInput = document.querySelector("#for-input");
const forBtn = document.querySelector("#add-for-btn");

// Against queries
const againstField = document.getElementById("against-section");
const toForBtn = document.querySelector("#for-btn");
const againstInput = document.querySelector("#against-input");
const againstBtn = document.querySelector("#add-against-btn");

// Tables
const forListContainer = document.querySelector("#for-list");
const againstListContainer = document.querySelector("#against-list");

// Buttons
let newBtn = document.querySelector("#new-btn");
let newBtn2 = document.querySelector("#new-btn2");
const askBtn = document.querySelector("#ask-btn");
const hammerIcon = document.querySelector("#ask-btn img");

const aiChatContainer = document.getElementById("ai-chat-container");
const userResponse = document.getElementById("user-response");

attachTopicBtnListener();
document.getElementById("new-btn")?.addEventListener("click", clear);
document.getElementById("new-btn2")?.addEventListener("click", clear);

// Initialize icons
createIcons({ icons });

// =========================
// Menu Button Click
// =========================
const imgElement = document.querySelector("#logo-ai");
const closeMenuBtn = document.querySelector("#close-modal");

menuBtn.addEventListener("click", () => {
	// Focus input of menu
	modalMenu.querySelector("input").focus();

	// Show the modal
	modalMenu.classList.remove("-translate-x-6/6");

	// Hide the logo
	imgElement.classList.add("invisible");
});

// Close modal on click of close button
closeMenuBtn.addEventListener("click", () => {
	modalMenu.classList.add("-translate-x-6/6");
	// Show the logo again
	imgElement.classList.remove("invisible");
});

// =========================
// Topic Button Click
// =========================
topicBtn.addEventListener("click", () => {
	const topicValue = topicInput.value.trim();
	if (topicValue === "") return;

	forAgainstField.classList.remove("opacity-50", "pointer-events-none");
	newBtn.classList.remove("opacity-50", "pointer-events-none");

	evaluation.topic = topicValue;
	console.log(`Topic : ${evaluation.topic}`);

	handleTopicInput(topicValue);
	saveAllData();
});

// =========================
// Against Button (1)
// =========================
toAgainstBtn.addEventListener("click", () => {
	forField.classList.replace("flex", "hidden");
	againstField.classList.replace("hidden", "flex");
});

// =========================
// For Button (2)
// =========================
toForBtn.addEventListener("click", () => {
	againstField.classList.replace("flex", "hidden");
	forField.classList.replace("hidden", "flex");
});

// =========================
// Add for Button
// =========================
forBtn.addEventListener("click", () => {
	const value = forInput.value.trim();
	if (value !== "") {
		const id = Date.now() + Math.random();
		evaluation.pros.push({ id, text: value });
		displayValue({ id, text: value }, forListContainer, "pros");
		forInput.value = "";
		console.log(evaluation.pros);
		saveAllData();
	}
});

// =========================
// Add against Button
// =========================
againstBtn.addEventListener("click", () => {
	const value = againstInput.value.trim();
	if (value !== "") {
		const id = Date.now() + Math.random();
		evaluation.cons.push({ id, text: value });
		displayValue({ id, text: value }, againstListContainer, "cons");
		againstInput.value = "";
		console.log(evaluation.cons);
		saveAllData();
	}
});

// =================================
// Topic Input and Button
// =================================

topicBtn.addEventListener("click", () => {
	const topicValue = topicInput.value.trim();
	if (topicValue === "") return;

	const forAgainstField = document.getElementById("for-against-field");
	forAgainstField.classList.remove("opacity-50", "pointer-events-none");
	newBtn.classList.remove("opacity-50", "pointer-events-none");

	evaluation.topic = topicValue;

	handleTopicInput(topicValue);
	saveAllData();
});

topicInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		topicBtn.click();
	}
});

function attachTopicBtnListener() {
	if (!topicBtn || !topicInput) return;

	topicBtn.addEventListener("click", () => {
		const topicValue = topicInput.value.trim();
		if (!topicValue) return;

		document
			.getElementById("for-against-field")
			.classList.remove("opacity-50", "pointer-events-none");
		document
			.getElementById("new-btn")
			.classList.remove("opacity-50", "pointer-events-none");

		evaluation.topic = topicValue;
		console.log(`Topic : ${evaluation.topic}`);

		handleTopicInput(topicValue);
		saveAllData();
	});
}

// =================================
// Ask Button
// =================================
askBtn?.addEventListener("click", () => {
	saveAllData();

	const btnField = document.querySelector("#btn-field");
	btnField.classList.add("opacity-50", "pointer-events-none");
	hammerIcon.classList.add("rotate-90", "rotate-animation");

	setTimeout(async () => {
		btnField.classList.remove("opacity-50", "pointer-events-none");
		btnField.classList.add("hidden");
		document.getElementById("ai-chat-container").classList.remove("hidden");
		topicInput.classList.add("opacity-50", "pointer-events-none");
		document
			.getElementById("for-against-field")
			.classList.add("opacity-50", "pointer-events-none");

		await analyzeWithStream(
			{
				topic: evaluation.topic,
				pros: evaluation.pros,
				cons: evaluation.cons,
				followUp: "",
				messages: chatMessages,
			},
			createAssistantBubble()
		);
	}, 300);

	updateChatUI();
	updateAskBtnState();
});

// Update askBtn state when a session is loaded
window.addEventListener("sessionLoaded", () => updateAskBtnState());

// =========================
// Render helpers for history.js
// =========================
function renderArguments(pros, cons) {
	const forListContainer = document.getElementById("for-list");
	const againstListContainer = document.getElementById("against-list");
	forListContainer.innerHTML = "";
	againstListContainer.innerHTML = "";
	pros.forEach((p) => displayValue(p, forListContainer, "pros"));
	cons.forEach((c) => displayValue(c, againstListContainer, "cons"));
}

function renderMessages(messages) {
	chatMessages = messages || [];
	evaluation.messages = chatMessages;
	updateChatUI();
}

export { saveAllData };
