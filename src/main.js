// Icons initialization
import { createIcons, icons } from "lucide";
// Global variables for chat messages
let chatMessages = [];
import { evaluation } from "./utils/appState.js";

// API client functions
import {
	loadArguments,
	saveArguments,
	clearArguments,
} from "./utils/apiClient.js";
import { postWithSession } from "./utils/session.js";
import {
	loadAllSessions,
	renderHistory,
	loadSession,
	saveSession,
} from "./utils/history.js";
import { displayValue, handleTopicInput } from "./utils/display.js";
import {
	formatText,
	analyzeWithStream,
	createAssistantBubble,
} from "./utils/chat.js";

// =========================
// Main Application Logic
// =========================

// Unique session ID for the current evaluation
const SESSION_ID = "default"; // ou généré dynamiquement

await saveArguments(
	evaluation.topic,
	evaluation.pros.map((p) => p.text),
	evaluation.cons.map((c) => c.text),
	evaluation.followUp,
	chatMessages,
	SESSION_ID
);

// Save data to the server
export async function sendArguments() {
	const topic = evaluation.topic || "";
	const pros = (evaluation.pros || []).map((item) => item.text);
	const cons = (evaluation.cons || []).map((item) => item.text);
	const followUp = (evaluation.followUp || []).map((item) => item.text);
	const messages = chatMessages.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}));

	try {
		await saveArguments(topic, pros, cons, followUp, messages, SESSION_ID);
		saveSession(topic, evaluation.pros, evaluation.cons, chatMessages);
	} catch (err) {
		console.error("Erreur lors de la sauvegarde :", err);
	}
}

renderHistory();

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

// Load data from the server
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
			(msg) =>
				msg && typeof msg.role === "string" && typeof msg.content === "string"
		);
		evaluation.messages = chatMessages;

		// Display topic
		if (evaluation.topic) {
			handleTopicInput(evaluation.topic);
			forAgainstField.classList.remove("opacity-50", "pointer-events-none");
			newBtn.classList.remove("opacity-50", "pointer-events-none");
		}

		// Display pros
		evaluation.pros.forEach((item) =>
			displayValue(item, forListContainer, "pros")
		);

		// Display cons
		evaluation.cons.forEach((item) =>
			displayValue(item, againstListContainer, "cons")
		);

		// Display chat messages
		chatMessages.forEach((msg) => {
			if (msg.role === "user") {
				const userMsg = document.createElement("div");
				userMsg.className =
					"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-center text-white p-3 rounded-xl mb-2 max-w-full break-words";
				userMsg.style.alignSelf = "flex-end";
				userMsg.textContent = msg.content;
				userResponse.appendChild(userMsg);
			} else if (msg.role === "assistant") {
				const assistantMsg = document.createElement("div");
				assistantMsg.className =
					"relative p-12 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-white drop-shadow-md mb-2 max-w-full break-words";
				assistantMsg.innerHTML = formatText(msg.content);
				userResponse.appendChild(assistantMsg);

				topicField.classList.add("opacity-50", "pointer-events-none");
				forAgainstField.classList.add("opacity-50", "pointer-events-none");
				if (document.getElementById("btn-field"))
					document.getElementById("btn-field").remove();
				aiChatContainer.classList.remove("hidden");
			}
		});

		data.topic ? console.log("Arguments chargés :", data) : "";
	} catch (err) {
		console.error("Erreur lors du chargement :", err);
	}
}
displayArguments();

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
	sendArguments();
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
		sendArguments();
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
		sendArguments();
	}
});

// =========================
// New Button
// =========================
newBtn.addEventListener("click", () => clean());
newBtn2.addEventListener("click", () => clean());

// =========================
// Ask Button
// =========================
askBtn.addEventListener("mouseover", async () => {
	hammerIcon.classList.add("rotate-6");
});

askBtn.addEventListener("mouseout", async () => {
	hammerIcon.classList.remove("rotate-6");
});

askBtn.addEventListener("click", async () => {
	// Save current arguments
	await sendArguments();

	// Rebuild the evaluation object
	evaluation.topic = evaluation.topic;
	evaluation.pros = evaluation.pros;
	evaluation.cons = evaluation.cons;
	evaluation.messages = chatMessages;
	evaluation.followUp = evaluation.followUp;

	// Display AI chat container
	aiChatContainer.classList.remove("hidden");

	topicField.classList.add("opacity-50", "pointer-events-none");
	forAgainstField.classList.add("opacity-50", "pointer-events-none");
	hammerIcon.classList.add("rotate-90");
	document
		.getElementById("btn-field")
		.classList.add("opacity-50", "pointer-events-none");

	setTimeout(async () => {
		document.getElementById("btn-field").remove();
		// Appeler uniquement analyzeWithStream
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
	}, 500);
});

// Function to update ask button state
export function updateAskBtnState() {
	let askBtn = document.querySelector("#ask-btn");
	if (
		evaluation.topic &&
		evaluation.pros.length > 0 &&
		evaluation.cons.length > 0
	) {
		askBtn.classList.remove("opacity-50", "pointer-events-none");
	} else {
		askBtn.classList.add("opacity-50", "pointer-events-none");
	}
}

// Fonction utilitaire pour gérer la touche Entrée
function handleEnterKey(input, button, event) {
	if (event.key === "Enter") {
		event.preventDefault();
		button.click();
	}
}

// Add keydown listeners for Enter key
topicInput.addEventListener("keydown", (e) =>
	handleEnterKey(topicInput, topicBtn, e)
);
forInput.addEventListener("keydown", (e) =>
	handleEnterKey(forInput, forBtn, e)
);
againstInput.addEventListener("keydown", (e) =>
	handleEnterKey(againstInput, againstBtn, e)
);

async function clean() {
	// Reset object evaluation
	await clearArguments();
	updateAskBtnState();

	// clean UI
	forListContainer.innerHTML = "";
	againstListContainer.innerHTML = "";

	// Reset topic field
	topicField.innerHTML = `
		<input
			class="border-2 border-gray-600 hover:border-gray-400 p-1 px-3.5 rounded-l-lg transition"
			type="text"
			id="topic-input"
			placeholder="Feed my son?"
		/>
		<button
			id="topic-btn"
			class="bg-black text-white font-bold p-1 px-2.5 rounded-r-lg cursor-pointer hover:opacity-95 transition"
			type="submit"
		>
			That's it
		</button>
		`;

	// disable for/against and new button
	forAgainstField.classList.add("opacity-50", "pointer-events-none");
	newBtn.classList.add("opacity-50", "pointer-events-none");
}
