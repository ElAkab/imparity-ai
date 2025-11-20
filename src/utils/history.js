// utils/history.js

import { createIcons, icons } from "lucide";
import { evaluation } from "./appState.js";
import { saveAllData } from "../main";
import {
	displayValue,
	handleTopicInput,
	updateAskBtnState,
} from "./display.js";
import { appendUserMessageToUI, formatText } from "./chat.js";
import * as apiClient from "./apiClient.js"; // <- On importe tout
import { isAuth } from "./isAuth.js";
import { newHTML } from "./clear-html.js";
import { getSessionId } from "./session.js";

let sessionsCache = {};

// Synchronise le cache local avec les données du backend.
export async function syncSessionsWithBackend() {
	if (!evaluation.isAuthenticated) return;

	try {
		const sessionsFromServer = await apiClient.loadSessions();
		sessionsCache = sessionsFromServer.reduce((acc, session) => {
			acc[session.id] = session;
			return acc;
		}, {});

		// Using the localStorage for the offline mode
		localStorage.setItem("sessions", JSON.stringify(sessionsCache));
	} catch (error) {
		console.error("Failed to sync sessions with backend :", error);
		sessionsCache = JSON.parse(localStorage.getItem("sessions") || {});
	}
}
// Récupère les sessions depuis le cache.
export function getSessions() {
	return sessionsCache;
}

export async function renderHistory() {
	await isAuth();

	if (!evaluation.isAuthenticated) {
		const historyField = document.getElementById("history-field");
		historyField.innerHTML = `
			<span class="mb-3 font-light">History ?</span>
			<a
				href="/pages/form/index.html"
				data-action="signup"
				class="w-full bg-white text-violet-600 text-nowrap text-center font-bold rounded-xl p-2.5 px-8 hover:bg-violet-50 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer active:scale-95"
			>
				Sign up
			</a>
			<a
				href="/pages/form/index1.html"
				data-action="signin"
				class="w-full bg-linear-to-tr from-violet-400 via-violet-500/65 to-violet-600 hover:to-violet-500 backdrop-blur-sm text-white text-nowrap text-center p-2.5 px-8 border-2  border-white-br font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer active:scale-95"
			>
				Log in
			</a>
		`;
		return;
	}

	const sendAiBtn = document.getElementById("ai-send-btn");
	if (sendAiBtn.classList.contains("opacity-50", "pointer-events-none")) {
		sendAiBtn.classList.remove("opacity-50", "pointer-events-none");
	}

	const historyList = document.getElementById("history-list");
	if (!historyList) return;

	const sessions = getSessions(); // <-- Cache

	historyList.innerHTML = "";

	Object.entries(sessions).forEach(([id, session]) => {
		// Principal element
		const li = document.createElement("li");
		li.className =
			"bg-indigo-400/60 border w-full rounded-3xl cursor-pointer transition p-2.5 px-8 flex justify-between items-center m-1 relative";

		// Text of the session
		const textSpan = document.createElement("span");
		textSpan.textContent = session.topic || "Empty session";
		textSpan.className =
			"flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis";

		// Menu icon
		const iconSpan = document.createElement("span");
		iconSpan.innerHTML = '<i data-lucide="ellipsis-vertical"></i>';
		iconSpan.className = "opacity-0 transition-opacity ml-2";

		// drop-down menu (hidden by default)
		const dropdown = document.createElement("div");
		dropdown.className =
			"history-dropdown absolute right-2 top-10 bg-indigo-400 border text-white rounded-lg shadow-md w-40 hidden flex-col z-10 transition-transform transform scale-95 opacity-0";
		dropdown.innerHTML = `
			<button class="dropdown-rename px-4 py-2 text-left hover:bg-indigo-500 w-full cursor-pointer">Rename</button>
			<button class="dropdown-delete px-4 py-2 text-left text-red-600 hover:bg-indigo-500 w-full cursor-pointer">Delete</button>
		`;

		// Load titles safely
		let titlesRaw = localStorage.getItem("titleSessions") || "{}";
		let titles;
		try {
			titles = JSON.parse(titlesRaw);
		} catch (err) {
			titles = {};
		}

		// Apply custom title if existing
		if (titles[id]) textSpan.textContent = titles[id];

		// Renaming management
		const renameBtn = dropdown.querySelector(".dropdown-rename");
		renameBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const newName = prompt("Enter new session name:", textSpan.textContent);
			if (newName) {
				textSpan.textContent = newName;
				session.topic = newName;

				// Update titleSessions
				titles[id] = newName;
				localStorage.setItem("titleSessions", JSON.stringify(titles));
				// localStorage.setItem("sessions", JSON.stringify(sessions));
			}
			closeDropdown(dropdown);
		});

		// Deletion management
		const deleteBtn = dropdown.querySelector(".dropdown-delete");
		deleteBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			if (!confirm(`Are you sure about that MDFK ?`)) return;

			try {
				await apiClient.deleteSession(id); // 1 - Delete on the server
				await syncSessionsWithBackend(); // 2 - Synchronize the cache with the server
				await renderHistory(); // 3 - Load the history display
			} catch (error) {
				console.error("Failed to delete session :", error);
			}
		});

		// Function to open/close the menu
		iconSpan.addEventListener("click", (e) => {
			e.stopPropagation();
			const isVisible = !dropdown.classList.contains("hidden");

			// Close all other menus
			document.querySelectorAll(".history-dropdown").forEach((menu) => {
				if (menu !== dropdown) closeDropdown(menu);
			});

			if (!isVisible) openDropdown(dropdown);
		});

		// Icon appears on hover
		li.addEventListener("mouseover", () => {
			iconSpan.classList.remove("opacity-0");
			iconSpan.classList.add("opacity-100");
		});
		li.addEventListener("mouseout", () => {
			iconSpan.classList.remove("opacity-100");
			iconSpan.classList.add("opacity-0");
		});

		// Session loads when the 'li' is clicked (excluding the icon).
		li.addEventListener("click", () => loadSession(id));

		// Adding elements
		li.appendChild(textSpan);
		li.appendChild(iconSpan);
		li.appendChild(dropdown);
		historyList.appendChild(li);

		const sessionId = getSessionId();

		if (id === sessionId && sessions[id])
			li.classList.add("border-4", "ring-indigo-600");
	});

	createIcons({ icons });

	// Global event to close menus
	document.addEventListener("click", (e) => {
		document.querySelectorAll(".history-dropdown").forEach((menu) => {
			if (!menu.contains(e.target)) closeDropdown(menu);
		});
	});
}

// Opens a dropdown menu with animation
function openDropdown(dropdown) {
	dropdown.classList.remove("hidden");
	requestAnimationFrame(() => {
		dropdown.classList.remove("scale-95", "opacity-0");
		dropdown.classList.add("scale-100", "opacity-100");
	});
}

// Close a dropdown menu with animation
function closeDropdown(dropdown) {
	dropdown.classList.remove("scale-100", "opacity-100");
	dropdown.classList.add("scale-95", "opacity-0");
	setTimeout(() => dropdown.classList.add("hidden"), 150);
}

export function loadSession(sessionId) {
	isAuth();

	const sessions = getSessions(); // <-- Cache
	const session = sessions[sessionId];
	if (!session) return;

	// ======================
	// Setup UI Elements
	// ======================
	const topicField = document.querySelector("#topic-field");
	const forAgainstField = document.querySelector("#for-against-field");
	const newBtn = document.querySelector("#new-btn");
	const chatContainer = document.querySelector("#ai-chat-container");
	const forListContainer = document.getElementById("for-list");
	const againstListContainer = document.getElementById("against-list");

	const h2 = topicField?.querySelector("h2");
	if (h2) {
		h2.innerHTML = `${session.topic}<div class="h-full w-0.5 bg-white mx-2"></div><i data-lucide="pencil" class="-mr-2"></i>`;
		createIcons({ icons });
	}

	// Enable fields
	forAgainstField?.classList.remove("opacity-50", "pointer-events-none");
	newBtn?.classList.remove("opacity-50", "pointer-events-none");

	// Clear previous UI lists
	if (forListContainer) forListContainer.innerHTML = "";
	if (againstListContainer) againstListContainer.innerHTML = "";

	// ======================
	// Build a fresh evaluation object
	// ======================
	const newEvaluation = {
		id: sessionId,
		topic: session.topic || "",
		pros: (session.pros || []).map((p) =>
			typeof p === "string" ? { id: Date.now() + Math.random(), text: p } : p
		),
		cons: (session.cons || []).map((c) =>
			typeof c === "string" ? { id: Date.now() + Math.random(), text: c } : c
		),
		messages: (session.messages || []).map((m) => ({
			role: m.role || m.sender || "assistant",
			content: m.content || m.text || "",
		})),
		followUp: session.followUp || [],
	};

	// Muter l'objet existant au lieu de réassigner
	Object.keys(evaluation).forEach((key) => delete evaluation[key]);
	Object.assign(evaluation, newEvaluation);

	// Save to localStorage
	localStorage.setItem("sessionId", sessionId);
	localStorage.setItem("evaluation", JSON.stringify(evaluation));

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
	// Display chat messages
	// ======================
	const userResponse = document.getElementById("user-response");
	if (!userResponse) return;

	userResponse.innerHTML = ""; // clear chat before adding new messages

	if (evaluation.messages.some((m) => m.content.trim())) {
		chatContainer?.classList.remove("hidden");
		document.querySelector("#btn-field")?.classList.add("hidden");
		topicField?.classList.add("opacity-50", "pointer-events-none");
		forAgainstField?.classList.add("opacity-50", "pointer-events-none");

		evaluation.messages.forEach((msg) => {
			if (msg.role === "user") {
				appendUserMessageToUI(msg.content);
			} else if (msg.role === "assistant") {
				const wrapper = document.createElement("div");
				wrapper.className = "mb-2";

				const bubble = document.createElement("div");
				bubble.className =
					"relative p-6 sm:p-12 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-sm sm:text-base text-white drop-shadow-md";
				bubble.innerHTML = formatText(msg.content);

				wrapper.appendChild(bubble);
				userResponse.appendChild(wrapper);
			}
		});
	} else {
		chatContainer.classList.add("hidden");
		topicField?.classList.remove("opacity-50", "pointer-events-none");
		forAgainstField?.classList.remove("opacity-50", "pointer-events-none");
		document.querySelector("#btn-field")?.classList.remove("hidden");
	}

	// ======================
	// Handle topic input and modal
	// ======================
	handleTopicInput(session.topic);
	document.getElementById("modale-menu")?.classList.add("-translate-x-6/6");
	document.querySelector("#logo-ai")?.classList.remove("invisible");

	// Dispatch event to notify session loaded
	window.dispatchEvent(new Event("sessionLoaded"));
	renderHistory();
}
