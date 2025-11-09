// utils/chat.js

// =========================
// Module chat IA avec stockage correct | user-response |
// =========================
import { saveAllData } from "../main";
import { evaluation } from "./appState.js";
import { loadAllSessions } from "./history.js";
import { getSessionId } from "./session.js";

export function getActiveSession() {
	return {
		sessions: loadAllSessions(),
		sessionId: getSessionId(),
	};
}

let isStreaming = false;

// =========================
// Analyser avec streaming
// =========================
export async function analyzeWithStream(allEvaluation, bubbleContext) {
	const { sessions, sessionId } = getActiveSession();

	const aiInput = document.getElementById("ai-input");
	const aiSendBtn = document.getElementById("ai-send-btn");

	if (isStreaming) return;
	isStreaming = true;

	if (aiInput) aiInput.disabled = true;
	if (aiSendBtn) aiSendBtn.disabled = true;

	// Get or create the bubble context
	let wrapper, typing, bubbleContent;
	if (bubbleContext) {
		wrapper = bubbleContext.wrapper;
		typing = bubbleContext.typing;
		bubbleContent = bubbleContext.bubbleContent;
	} else {
		const created = createAssistantBubble();
		wrapper = created.wrapper;
		typing = created.typing;
		bubbleContent = created.bubbleContent;
	}

	if (!wrapper || !bubbleContent) {
		console.error("Error : Wrapper or bubbleContent not defined !");
		isStreaming = false;
		if (aiInput) aiInput.disabled = false;
		if (aiSendBtn) aiSendBtn.disabled = false;
		return;
	}

	let fullText = "";
	let firstChunk = true;

	try {
		const response = await fetch("http://localhost:3000/api/analyze-stream", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(allEvaluation),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const data = line.slice(6);

				if (data === "[DONE]") {
					const assistantMsg = { role: "assistant", content: fullText };

					if (!evaluation.messages) evaluation.messages = [];
					evaluation.messages.push(assistantMsg);

					if (!sessions[sessionId]) {
						sessions[sessionId] = {
							topic: evaluation.topic || "",
							pros: evaluation.pros || [],
							cons: evaluation.cons || [],
							followUp: evaluation.followUp || [],
							messages: [],
							savedAt: Date.now(),
						};
					}

					sessions[sessionId].messages = structuredClone(evaluation.messages);

					localStorage.setItem("sessions", JSON.stringify(sessions));
					localStorage.setItem("evaluation", JSON.stringify(evaluation));

					if (typing?.parentElement) typing.remove();

					isStreaming = false;
					if (aiInput) aiInput.disabled = false;
					if (aiSendBtn) aiSendBtn.disabled = false;

					saveAllData();
					return;
				}

				// Parsing JSON chunk
				try {
					const parsed = JSON.parse(data);
					if (parsed.text) {
						if (firstChunk && typing?.parentElement) {
							typing.remove();
							firstChunk = false;
						}
						fullText += parsed.text;
						bubbleContent.innerHTML = formatText(fullText);
						bubbleContent.parentElement?.scrollIntoView({ behavior: "smooth" });
					}
				} catch (e) {
					console.error("Error parsing chunk:", e);
				}
			}
		}
	} catch (error) {
		console.error("AI analysis error : ", error);
		if (bubbleContent)
			bubbleContent.innerHTML = `<p class="text-red-500 font-bold">❌ Error : ${error.message}</p>`;
		isStreaming = false;
		if (aiInput) aiInput.disabled = false;
		if (aiSendBtn) aiSendBtn.disabled = false;
	}
}

// =========================
// Format text
// =========================
export function formatText(text) {
	if (!text) text = "";
	text = String(text);

	let formattedText = text
		.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold my-2">$1</h3>')
		.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold my-3">$1</h2>')
		.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold my-4">$1</h1>')
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.*?)\*/g, "<em>$1</em>")
		.replace(/^\d+\.\s+([^\n]*)/gm, '<li class="ml-5">$1</li>')
		.replace(/^[-*]\s+([^\n]*)/gm, '<li class="ml-5">$1</li>')
		.replace(
			/^\>\s(.*$)/gm,
			'<blockquote class="border-l-4 border-gray-300 pl-4 my-2 italic">$1</blockquote>'
		)
		.replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
		.replace(/\n\s*\n/g, '</p><p class="my-2">');

	formattedText = formattedText.replace(
		/((?:<li[^>]*>.*?<\/li>\s*)+)/g,
		'<ul class="list-disc my-2">$1</ul>'
	);

	return formattedText.trim();
}

// =========================
// Append user message
// =========================
export function appendUserMessageToUI(text) {
	const userResponse = document.getElementById("user-response");
	if (!userResponse) return;
	userResponse.classList.remove("hidden");

	const msgDiv = document.createElement("div");
	msgDiv.className =
		"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-white text-center p-2 rounded-xl mb-2 max-w-full break-words";
	msgDiv.style.alignSelf = "flex-end";
	msgDiv.textContent = text;
	userResponse.appendChild(msgDiv);
	userResponse.scrollTop = userResponse.scrollHeight;

	const userMsgObj = { role: "user", content: text };

	if (!window.chatMessages) window.chatMessages = [];
	window.chatMessages.push(userMsgObj);

	if (!evaluation.messages) evaluation.messages = [];
	const lastMsg = evaluation.messages.at(-1);
	if (!lastMsg || lastMsg.content !== text || lastMsg.role !== "user") {
		evaluation.messages.push(userMsgObj);
	}

	const { sessions, sessionId } = getActiveSession();

	// Save in session
	if (!sessions[sessionId]) {
		sessions[sessionId] = {
			topic: evaluation.topic || "",
			pros: evaluation.pros || [],
			cons: evaluation.cons || [],
			followUp: evaluation.followUp || [],
			messages: [],
			savedAt: Date.now(),
		};
	}
	sessions[sessionId].messages = evaluation.messages.slice();

	localStorage.setItem("sessions", JSON.stringify(sessions));
	localStorage.setItem("evaluation", JSON.stringify(evaluation));

	if (typeof saveAllData === "function") saveAllData();
}

// =========================
// Create the assistant bubble
// =========================
export function createAssistantBubble() {
	const userResponse = document.getElementById("user-response");
	userResponse.classList.remove("hidden");

	const wrapper = document.createElement("div");
	wrapper.className = "mb-2";

	const bubble = document.createElement("div");
	bubble.className =
		"relative p-12 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-white drop-shadow-md";

	const bubbleContent = document.createElement("div");
	bubbleContent.className = "bubble-content";
	bubble.appendChild(bubbleContent);

	const typing = document.createElement("div");
	typing.className = "flex items-center gap-2 mb-2 text-white typing-wrapper";
	typing.innerHTML = `
		<div class="typing-indicator"><span></span><span></span><span></span></div>
		<span id="analyze-in-progress" class="font-medium">Analyze in progress...</span>
	`;

	wrapper.appendChild(typing);
	wrapper.appendChild(bubble);
	userResponse.appendChild(wrapper);
	userResponse.scrollTop = userResponse.scrollHeight;

	return { wrapper, typing, bubble, bubbleContent };
}

// =========================
// Send AI message
// =========================
export async function sendAiMessage() {
	if (isStreaming) return;

	const text = document.getElementById("ai-input").value.trim();
	if (!text) return;

	appendUserMessageToUI(text);

	document.getElementById("ai-input").value = "";
	document.getElementById("ai-input").focus();

	const payload = {
		topic: evaluation.topic,
		pros: evaluation.pros,
		cons: evaluation.cons,
		followUp: text,
		messages: window.chatMessages || [],
	};

	const { wrapper, typing, bubbleContent } = createAssistantBubble();
	await analyzeWithStream(payload, { wrapper, typing, bubbleContent });
}

// =========================
// Events
// =========================
document.getElementById("ai-send-btn")?.addEventListener("click", (e) => {
	e.preventDefault();
	if (!isStreaming) sendAiMessage();
});
document.getElementById("ai-input")?.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendAiMessage();
	}
});
