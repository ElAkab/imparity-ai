// utils/load-modal.js

export async function loadModal(evaluation) {
	// Sélection du container après lequel on veut insérer le modal
	const chatContainer = document.querySelector("#ai-chat-container");
	if (!chatContainer) return; // sécurité si l'élément n'existe pas

	// Charger le modal depuis le fichier HTML
	const response = await fetch("/modal.html");
	const html = await response.text();

	// Insérer le modal juste après le form
	chatContainer.insertAdjacentHTML("afterend", html);

	const modal = document.querySelector("#plan-field");

	// Ajouter un bouton close si nécessaire
	const closeBtn = modal.querySelector(".modal-close");
	if (closeBtn) {
		closeBtn.addEventListener("click", () => {
			modal.classList.replace("flex", "hidden");
		});
	}

	// Sélection des éléments AI
	const aiInput = document.querySelector("#ai-input");
	const aiSendBtn = document.querySelector("#ai-send-btn");

	// Logique d'affichage selon l'authentification
	if (!evaluation.isAuthenticated) {
		modal.classList.replace("hidden", "flex");
		if (aiInput) aiInput.disabled = true;
		if (aiSendBtn) {
			aiSendBtn.disabled = true;
			aiSendBtn.classList.add("opacity-50", "pointer-events-none");
		}
	} else {
		modal.classList.replace("flex", "hidden");
		if (aiInput) aiInput.disabled = false;
		if (aiSendBtn) {
			aiSendBtn.disabled = false;
			aiSendBtn.classList.remove("opacity-50", "pointer-events-none");
		}
	}
}
