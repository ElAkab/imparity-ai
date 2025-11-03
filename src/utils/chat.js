// =========================
// Fonction to analyze with streaming (100% AI help, shame on me)
// =========================
import { sendArguments } from "../main";
import { evaluation } from "./appState.js";
let isStreaming = false;

export async function analyzeWithStream(
	evaluation,
	bubbleContext,
	chatMessages = []
) {
	const aiInput = document.getElementById("ai-input");
	const aiSendBtn = document.getElementById("ai-send-btn");

	let isStreaming = true;
	if (aiInput) aiInput.disabled = true;
	if (aiSendBtn) aiSendBtn.disabled = true;

	// Obtenir ou créer le bubble context
	let wrapper, typing, contentDiv;
	if (bubbleContext) {
		wrapper = bubbleContext.wrapper;
		typing = bubbleContext.typing;
		contentDiv = bubbleContext.bubble;
	} else {
		const created = createAssistantBubble();
		wrapper = created?.wrapper || null;
		typing = created?.typing || null;
		contentDiv = created?.bubble || null;
	}

	if (!wrapper || !contentDiv) {
		console.error("Erreur : wrapper ou contentDiv non défini !");
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
			body: JSON.stringify(evaluation),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const data = line.slice(6);
					if (data === "[DONE]") {
						chatMessages.push({ role: "assistant", content: fullText });
						if (typing?.parentElement) typing.remove();

						isStreaming = false;
						if (aiInput) {
							aiInput.disabled = false;
							aiInput.focus();
						}
						if (aiSendBtn) aiSendBtn.disabled = false;

						sendArguments();
						return;
					}

					try {
						const parsed = JSON.parse(data);
						if (parsed.text) {
							if (firstChunk && typing?.parentElement) {
								typing.remove();
								firstChunk = false;
							}

							fullText += parsed.text;
							contentDiv.innerHTML = formatText(fullText);
							contentDiv.parentElement?.scrollIntoView({ behavior: "smooth" });
						}
					} catch (e) {
						console.error("Erreur parsing:", e);
					}
				}
			}
		}
	} catch (error) {
		console.error("Erreur:", error);
		if (contentDiv) {
			contentDiv.innerHTML = `<p class="text-red-500 font-bold">❌ Erreur: ${error.message}</p>`;
		}
		isStreaming = false;
		if (aiInput) aiInput.disabled = false;
		if (aiSendBtn) aiSendBtn.disabled = false;
	}
}

// Function to format text with HTML (90% AI help, don't judge me please..)
export function formatText(text) {
	// Basic Markdown-like formatting
	let formattedText = text
		// Headers
		.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold my-2">$1</h3>')
		.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold my-3">$1</h2>')
		.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold my-4">$1</h1>')

		// Emphasis
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.*?)\*/g, "<em>$1</em>")

		// Lists
		.replace(/^\d+\.\s+([^\n]*)/gm, '<li class="ml-5">$1</li>')
		.replace(/^[-*]\s+([^\n]*)/gm, '<li class="ml-5">$1</li>')

		// Blockquotes
		.replace(
			/^\>\s(.*$)/gm,
			'<blockquote class="border-l-4 border-gray-300 pl-4 my-2 italic">$1</blockquote>'
		)

		// Code
		.replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')

		// Paragraphs
		.replace(/\n\s*\n/g, '</p><p class="my-2">');

	// Wrap lists
	formattedText = formattedText.replace(
		/((?:<li[^>]*>.*?<\/li>\s*)+)/g,
		'<ul class="list-disc my-2">$1</ul>'
	);

	return formattedText.trim();
}

// =========================
// AI Chat Input and Send Button (100% AI help, I beg you forgive me)
// =========================
const aiInput = document.getElementById("ai-input");
const aiSendBtn = document.getElementById("ai-send-btn");

// =========================
// Append user message to UI and store in history (100% AI help, I confess)
// =========================
export function appendUserMessageToUI(text) {
	const userResponse = document.getElementById("user-response");
	if (!userResponse) {
		console.error("Erreur : container 'user-response' introuvable !");
		return;
	}
	userResponse.classList.remove("hidden");

	const msg = document.createElement("div");
	msg.className =
		"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-white p-3 rounded-xl mb-2 max-w-full break-words";
	msg.style.alignSelf = "flex-end";
	msg.textContent = text;

	userResponse.appendChild(msg);
	userResponse.scrollTop = userResponse.scrollHeight;

	if (!window.chatMessages) window.chatMessages = [];
	window.chatMessages.push({ role: "user", content: text });
}

// =========================
// Create assistant bubble (100% AI help, I beg you don't judge me.. I tried my best i swear)
// =========================
export function createAssistantBubble() {
	// Use AI response container
	let userResponse = document.getElementById("user-response");
	userResponse.classList.remove("hidden");

	const wrapper = document.createElement("div");
	wrapper.className = "mb-2";

	const bubble = document.createElement("div");
	bubble.className =
		"relative p-12 rounded-xl border shadow-md bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.7)_0%,_rgba(99,21,244,0.65)_100%)] backdrop-blur-sm text-white drop-shadow-md";
	bubble.innerHTML = ""; // Will be filled during streaming

	// typing indicator au dessus de la bulle (sera supprimé au premier chunk)
	const typing = document.createElement("div");
	typing.className = "flex items-center gap-2 mb-2 text-white typing-wrapper";
	typing.innerHTML = `
        <div class="typing-indicator"><span></span><span></span><span></span></div>
        <span class="font-medium">Analyse en cours...</span>
    `;

	wrapper.appendChild(typing);
	wrapper.appendChild(bubble);
	userResponse.appendChild(wrapper);
	userResponse.scrollTop = userResponse.scrollHeight;

	return { wrapper, typing, bubble };
}

// ========================
// Protect send to avoid concurrent sends (100% AI help, I surrender)
// =======================
export async function sendAiMessage() {
	if (isStreaming) return; // Prevent multiple sends during streaming
	const text = aiInput.value.trim();
	if (!text) return;

	// Append user message to UI and history
	appendUserMessageToUI(text);
	aiInput.value = "";
	aiInput.focus();

	// Prepare payload for analysis
	const payload = {
		topic: evaluation.topic,
		pros: evaluation.pros,
		cons: evaluation.cons,
		followUp: text, // User's follow-up question
		messages: chatMessages, // Full chat history
	};

	// Create assistant bubble and analyze with stream
	const { wrapper, typing, bubble } = createAssistantBubble();
	await analyzeWithStream(payload, { wrapper, typing, bubble });
}

// Send AI message on button click
aiSendBtn.addEventListener("click", (e) => {
	e.preventDefault();
	if (!isStreaming) {
		sendAiMessage();
	}
});

// Send AI message on Enter key
aiInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendAiMessage();
	}
});

export default {
	appendUserMessageToUI,
	createAssistantBubble,
	formatText,
	analyzeWithStream,
};
