// =========================
// Imports
// =========================
import { createIcons, icons } from "lucide";
import { newHTML } from "./utils/clear-html.js";
import { evaluation } from "./utils/appState.js";
import {
	resetSession,
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
import { isAuth } from "./utils/isAuth.js";

// =========================
// Global variables
// =========================
const sessions = loadAllSessions();
const SESSION_ID = getSessionId();

// console.log(isAuth()); // true ou false
console.log(evaluation.isAuthenticated); // correspond à la même valeur

await isAuth();
console.log(evaluation.isAuthenticated); // correspond à la même valeur

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
	const pros = Array.isArray(evaluation.pros)
		? evaluation.pros.map((p) => p.text)
		: [];
	const cons = Array.isArray(evaluation.cons)
		? evaluation.cons.map((c) => c.text)
		: [];
	const followUp = Array.isArray(evaluation.followUp)
		? evaluation.followUp.map((f) => f.text || f)
		: [];
	const messages = Array.isArray(evaluation.messages)
		? evaluation.messages
		: [];

	try {
		await saveArguments(topic, pros, cons, followUp, messages, SESSION_ID);
		saveSession(
			topic,
			evaluation.pros,
			evaluation.cons,
			evaluation.followUp,
			messages
		);
	} catch (err) {
		console.error("Error during backup :", err);
	}
}

let askBtn = document.getElementById("ask-btn");

async function clear() {
	await clearArguments();
	resetSession(true);

	evaluation.topic = "";
	evaluation.pros = evaluation.pros || [];
	evaluation.cons = evaluation.cons || [];
	evaluation.followUp = evaluation.followUp || [];
	evaluation.messages = evaluation.messages || [];

	evaluation.topic = "";
	evaluation.pros = [];
	evaluation.cons = [];
	evaluation.followUp = [];
	evaluation.messages = [];

	newHTML();
	document.getElementById("topic-field").innerHTML = `
		<input type="text" id="topic-input" placeholder="Feed my son?" class="border-2 border-t-blue-900/40 border-black hover:border-black focus:border-2 focus:border-black p-1 px-3.5 rounded-l-lg rounded-r-none transition"/>
		<button id="topic-btn" class="bg-linear-to-t from-blue-950 via-black to-red-950 text-white font-bold p-1 px-2.5 rounded-r-lg cursor-pointer hover:text-violet-100 transition">That's it</button>
	`;

	attachTopicBtnListener();
	updateChatUI();

	if (!modalMenu.classList.contains("-translate-x-6/6"))
		modalMenu.classList.add("-translate-x-6/6");
}

createIcons({ icons });

renderHistory(renderArguments, renderMessages);

let chatMessages = [];

// Topic
let topicField = document.querySelector("#topic-field");
let topicInput = document.querySelector("#topic-input");

let authButtons = document.querySelector("#auth-buttons");
let userMenu = document.querySelector("#user-menu");
let userDropdown = document.querySelector("#dropdown");

if (evaluation.isAuthenticated) {
	// L’utilisateur est connecté
	authButtons.classList.replace("flex", "hidden"); // cacher "Se connecter"
	userMenu.classList.remove("hidden"); // afficher le menu utilisateur
} else {
	// L’utilisateur n’est pas connecté
	authButtons.classList.replace("hidden", "flex"); // afficher "Se connecter"
	userMenu.classList.add("hidden"); // cacher le menu utilisateur
}

userMenu.addEventListener("click", () => {
	if (userDropdown.classList.contains("hidden"))
		userDropdown.classList.replace("hidden", "flex");
	else userDropdown.classList.replace("flex", "hidden");
});

let logOut = document.querySelector("#log-out");
logOut.addEventListener("click", async () => {
	if (!confirm("Are you sure ? 🥺🖕🏿")) return;

	const req = await fetch("/api/log-out", {
		method: "DELETE",
		credentials: "include",
	});

	// Vérifier si la requête a réussi
	if (!req.ok) {
		// récupérer le message d’erreur
		const errData = await req.json();
		return alert(errData.message || "Something went wrong");
	}

	// Lire la réponse JSON si tout est ok
	const res = await req.json();
	alert(res.message);

	isAuth();
	location.reload();
});

// Tables
const forListContainer = document.querySelector("#for-list");
const againstListContainer = document.querySelector("#against-list");

const hammerIcon = document.querySelector("#ask-btn img");

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

attachTopicBtnListener();

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

// | Menu button / menu | init
let menuBtn = document.querySelector("#menu-btn");
let modalMenu = document.querySelector("#modale-menu");

// | Logo / close menu button | init
const imgElement = document.querySelector("#logo-ai");
const closeMenuBtn = document.querySelector("#close-modal");

// =========================
// Menu Button Click
// =========================
menuBtn.addEventListener("click", (e) => {
	e.stopPropagation();

	modalMenu.querySelector("input").focus();
	modalMenu.classList.remove("-translate-x-6/6");
	imgElement.classList.add("invisible");
});

// (Close modal after a click anywhere)
document.addEventListener("click", (e) => {
	if (!modalMenu.contains(e.target)) {
		modalMenu.classList.add("-translate-x-6/6");
		imgElement.classList.remove("invisible");
	}
});

// Close modal on click of close button
closeMenuBtn.addEventListener("click", () => {
	modalMenu.classList.add("-translate-x-6/6");
	imgElement.classList.remove("invisible");
});

document.getElementById("new-chat-btn")?.addEventListener("click", () => {
	const allSessions = loadAllSessions();
	const sessionId = getSessionId();
	const currentSession = allSessions[sessionId];
	if (currentSession.topic === "") return;

	evaluation.topic = "";
	evaluation.pros = [];
	evaluation.cons = [];
	evaluation.followUp = [];
	evaluation.messages = [];

	if (topicField.classList.contains("opacity-50", "pointer-events-none"))
		topicField.classList.remove("opacity-50", "pointer-events-none");

	clear();

	import("./utils/history.js").then((mod) => mod.renderHistory());

	console.log("New session created : ", sessionId);
});

document.getElementById("clear-btn")?.addEventListener("click", () => {
	if (!confirm("Are you sure you want to delete all session?")) return;

	clearSessionData(); // Clear all localStorage
	clear(); // Clear évaluation + UI
	renderHistory();

	imgElement.classList.remove("invisible");
});

const againstBtn = document.querySelector("#against-btn");
const forBtn = document.querySelector("#for-btn");

function switchList() {
	const againstField = document.querySelector("#against-section");
	const forField = document.querySelector("#for-section");

	if (againstField.classList.contains("hidden")) {
		againstField.classList.remove("hidden");
		forField.classList.add("hidden");
	} else {
		againstField.classList.add("hidden");
		forField.classList.remove("hidden");
	}
}

againstBtn.addEventListener("click", switchList);
forBtn.addEventListener("click", switchList);

// =========================
// Add For / Against
// =========================
document.getElementById("add-for-btn")?.addEventListener("click", () => {
	const input = document.getElementById("for-input");
	if (!input) return;
	const value = input.value.trim();
	if (!value) return;

	const id = Date.now() + Math.random();
	evaluation.pros.push({ id, text: value });
	displayValue(
		{ id, text: value },
		document.getElementById("for-list"),
		"pros"
	);

	input.value = "";
	input.focus();
	saveAllData();
});

document.getElementById("add-against-btn")?.addEventListener("click", () => {
	const input = document.getElementById("against-input");
	if (!input) return;
	const value = input.value.trim();
	if (!value) return;

	const id = Date.now() + Math.random();
	evaluation.cons.push({ id, text: value });
	displayValue(
		{ id, text: value },
		document.getElementById("against-list"),
		"cons"
	);

	input.value = "";
	input.focus();
	saveAllData();
});

// =========================
// Ask Button
// =========================
askBtn.addEventListener("click", async () => {
	saveAllData();

	const btnField = document.querySelector("#btn-field");
	btnField.classList.add("opacity-50", "pointer-events-none");
	hammerIcon.classList.add("rotate-90", "rotate-animation");

	setTimeout(async () => {
		topicField.classList.add("opacity-50", "pointer-events-none");
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

	updateAskBtnState();
});

// =========================
// New / Clear
// =========================
document.getElementById("new-btn")?.addEventListener("click", clear);
document.getElementById("new-btn2")?.addEventListener("click", clear);

export { saveAllData };
