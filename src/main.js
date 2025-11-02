import "./style.css";

// Icons initialization
import { createIcons, icons } from "lucide";

let evaluation = {
	topic: "",
	pros: [],
	cons: [],
};

// Menu button / modal
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
const newBtn = document.querySelector("#new-btn");
const askBtn = document.querySelector("#ask-btn");
const hammerIcon = document.querySelector("#ask-btn img");

const aiChatContainer = document.getElementById("ai-chat-container");
const aiResponse = document.getElementById("ai-response");

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
	}
});

// =========================
// New Button
// =========================
newBtn.addEventListener("click", () => {
	// Reset object evaluation
	evaluation = { topic: "", pros: [], cons: [] };
	console.log(evaluation);

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
			class="bg-black text-white font-bold p-1 px-2.5 rounded-r-lg cursor-pointer hover:opacity-95 transition"
			type="submit"
		>
			That's it
		</button>
	`;

	// Re-hook inputs and buttons
	topicInput = document.querySelector("#topic-input");
	topicBtn = document.querySelector("#topic-btn");

	// disable for/against and new button
	forAgainstField.classList.add("opacity-50", "pointer-events-none");
	newBtn.classList.add("opacity-50", "pointer-events-none");

	// Re-hook topic button event
	topicBtn.addEventListener("click", () => {
		const topicValue = topicInput.value.trim();
		if (topicValue === "") return;

		forAgainstField.classList.remove("opacity-50", "pointer-events-none");
		newBtn.classList.remove("opacity-50", "pointer-events-none");

		evaluation.topic = topicValue;
		handleTopicInput(topicValue);
	});
});

askBtn.addEventListener("mouseover", async () => {
	hammerIcon.classList.add("rotate-6");
});

askBtn.addEventListener("mouseout", async () => {
	hammerIcon.classList.remove("rotate-6");
});

askBtn.addEventListener("click", async () => {
	// clean and rebuild the evaluation object
	evaluation = {
		topic: evaluation.topic,
		pros: Array.from(forListContainer.querySelectorAll("li p")).map((el) => ({
			text: el.textContent,
		})),
		cons: Array.from(againstListContainer.querySelectorAll("li p")).map(
			(el) => ({
				text: el.textContent,
			})
		),
	};

	// Display AI chat container
	aiChatContainer.classList.remove("hidden");

	topicField.classList.add("opacity-50", "pointer-events-none");
	forAgainstField.classList.add("opacity-50", "pointer-events-none");
	hammerIcon.classList.add("rotate-90");
	document
		.getElementById("btn-field")
		.classList.add("opacity-50", "pointer-events-none");

	setTimeout(() => {
		document.getElementById("btn-field").remove();
		// Appeler uniquement analyzeWithStream
		analyzeWithStream(evaluation);
	}, 500);
});

// =========================
// Function handleTopicInput (20% AI help)
// =========================
function handleTopicInput(topicValue) {
	const pencilIcon = document.createElement("I");
	pencilIcon.classList.add("ml-2");
	pencilIcon.textContent = `<i data-lucide="pencil"></i>`;

	// Create h2 element
	const h2 = document.createElement("h2");
	h2.classList.add(
		"text-2xl",
		"text-indigo-100",
		"p-3",
		"px-6",
		"flex",
		"gap-2",
		"items-center",
		"rounded-xl",
		"font-bold",
		"border-2",
		"border-black",
		"cursor-pointer",
		"bg-gradient-to-tr",
		"from-blue-900",
		"via-black",
		"to-red-900",
		"transition-all",
		"duration-500",
		"ease-in-out"
	);

	h2.innerHTML = `${topicValue}<div class="h-full w-0.5 bg-white mx-2"></div><i data-lucide="pencil" class="-mr-2"></i>`;
	createIcons({ icons });

	// Replace input by h2
	if (topicField.contains(topicInput)) {
		topicField.replaceChild(h2, topicInput);

		createIcons({ icons });
	}

	topicBtn.remove();

	// =========================
	// Click on h2 to edit
	// =========================
	h2.addEventListener("click", () => {
		if (topicField.querySelector("button")) return; // Prevent multiple edits

		let input = document.createElement("input");
		input.type = "text";
		input.value = h2.textContent;
		input.classList.add("border", "rounded", "p-1", "w-full");

		topicField.replaceChild(input, h2);

		let editBtn = document.createElement("button");
		editBtn.classList.add(
			"bg-black",
			"text-white",
			"font-bold",
			"p-1",
			"px-2.5",
			"rounded-r-lg",
			"cursor-pointer",
			"hover:opacity-95",
			"transition"
		);
		editBtn.textContent = "Edit";
		topicField.append(editBtn);
		input.focus();

		let lastTopic = input.value;

		const finishEdit = () => {
			if (!topicField.contains(input)) return;
			h2.innerHTML = `${
				input.value || lastTopic
			}<div class="h-full w-0.5 bg-white mx-2"></div><i data-lucide="pencil" class="-mr-2"></i>`;
			topicField.replaceChild(h2, input);
			editBtn.remove();

			evaluation.topic = h2.textContent;
			createIcons({ icons });
			console.log(`Topic edited : ${evaluation.topic}`);
		};

		input.addEventListener("blur", finishEdit);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") finishEdit();
		});
	});
}

// =========================
// Function displayValue (45% AI help)
// =========================
function displayValue(item, container, type) {
	if (
		forListContainer.querySelector("li") ||
		againstListContainer.querySelector("li")
	)
		askBtn.classList.remove("opacity-50", "pointer-events-none");

	const element = document.createElement("li");
	element.classList.add(
		"w-full",
		"flex",
		"justify-between",
		"items-center",
		"gap-2"
	);

	element.dataset.id = item.id;

	const text = document.createElement("p");
	text.textContent = item.text;

	const editIcon = document.createElement("span");
	editIcon.innerHTML = '<i data-lucide="pen"></i>';
	editIcon.classList.add("cursor-pointer", "text-white", "font-bold");

	const deleteIcon = document.createElement("span");
	deleteIcon.innerHTML = '<i data-lucide="trash-2"></i>';
	deleteIcon.classList.add("cursor-pointer", "text-red-600");

	element.append(deleteIcon, text, editIcon);
	container.append(element);
	createIcons({ icons });

	// =========================
	// Edit Icon
	// =========================
	editIcon.addEventListener("click", () => {
		let finished = false; // 🧩 placé ici pour éviter référence avant initialisation
		let input = document.createElement("input");
		input.type = "text";
		input.value = text.textContent;
		input.classList.add("border", "rounded", "p-1", "w-full");

		element.replaceChild(input, text);
		input.focus();

		const finishEdit = () => {
			if (finished) return;
			finished = true;
			if (!element.contains(input)) return;

			text.textContent = input.value || item.text;
			element.replaceChild(text, input);

			const arr = type === "pros" ? evaluation.pros : evaluation.cons;
			const index = arr.findIndex((el) => el.id === item.id);
			if (index > -1) arr[index].text = input.value;
			console.log(arr);
			item.text = input.value;
		};

		input.addEventListener("blur", finishEdit);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") finishEdit();
		});
	});

	// =========================
	// Delete Icon
	// =========================
	deleteIcon.addEventListener("click", () => {
		element.remove();
		const arr = type === "pros" ? evaluation.pros : evaluation.cons;
		const index = arr.findIndex((el) => el.id === item.id);
		if (index > -1) arr.splice(index, 1);
	});
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

// =========================
// Fonction to analyze with streaming (100% AI help, shame on me)
// =========================
let isStreaming = false;

async function analyzeWithStream(evaluation, bubbleContext) {
	// Désactiver l'input d'IA pendant le streaming
	isStreaming = true;
	if (aiInput) aiInput.disabled = true;
	if (aiSendBtn) aiSendBtn.disabled = true;

	// Récupérer les éléments du contexte ou créer une nouvelle bulle
	let wrapper, typing, contentDiv;
	if (bubbleContext) {
		wrapper = bubbleContext.wrapper;
		typing = bubbleContext.typing;
		contentDiv = bubbleContext.bubble;
	} else {
		const created = createAssistantBubble();
		wrapper = created.wrapper;
		typing = created.typing;
		contentDiv = created.bubble;
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
						if (typing && typing.parentElement) typing.remove();

						isStreaming = false;
						if (aiInput) {
							aiInput.disabled = false;
							aiInput.focus();
						}
						if (aiSendBtn) aiSendBtn.disabled = false;
						return;
					}

					try {
						const parsed = JSON.parse(data);
						if (parsed.text) {
							if (firstChunk) {
								if (typing && typing.parentElement) typing.remove();
								firstChunk = false;
							}

							fullText += parsed.text;
							contentDiv.innerHTML = formatText(fullText);
							contentDiv.parentElement.scrollIntoView({ behavior: "smooth" });
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
function formatText(text) {
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

// Features for AI chat input
const aiInput = document.getElementById("ai-input");
const aiSendBtn = document.getElementById("ai-send-btn");

let chatMessages = [];

// =========================
// Append user message to UI and store in history (100% AI help, I confess)
// =========================
function appendUserMessageToUI(text) {
	// Use AI response container
	const history = document.getElementById("ai-response");
	history.classList.remove("hidden");

	const msg = document.createElement("div");
	msg.className =
		"self-end bg-linear-to-r from-blue-900 via-black to-red-900 text-white p-3 rounded-xl mb-2 max-w-full break-words";
	msg.style.alignSelf = "flex-end";
	msg.textContent = text;

	history.appendChild(msg);
	history.scrollTop = history.scrollHeight;

	// Store in chat history
	chatMessages.push({ role: "user", content: text });
}

// =========================
// Create assistant bubble (100% AI help, I beg you don't judge me.. I tried my best i swear)
// =========================
function createAssistantBubble() {
	const history = document.getElementById("ai-response");
	history.classList.remove("hidden");

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
	history.appendChild(wrapper);
	history.scrollTop = history.scrollHeight;

	return { wrapper, typing, bubble };
}

// ========================
// Protect send to avoid concurrent sends (100% AI help, I surrender)
// =======================
async function sendAiMessage() {
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
		followUp: text,
		messages: chatMessages, // Optionslly include full chat history
	};

	// Create assistant bubble and analyze with stream
	const { wrapper, typing, bubble } = createAssistantBubble();
	await analyzeWithStream(payload, { wrapper, typing, bubble });
}

// Send AI message on button click
aiSendBtn.addEventListener("click", () => sendAiMessage());

// Send AI message on Enter key
aiInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendAiMessage();
	}
});
