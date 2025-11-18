// Signup script

// Imports
import { generatePassword } from "./generate";

// =========================
// Initialization
// =========================
const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const generateBtn = document.getElementById("generate-password-btn");
const confirmPasswordInput = document.getElementById("confirm-password");
const submitBtn = document.getElementById("submit-btn");

// =========================
// Eyes icons helper
// =========================
function eyesIcons() {
	const open1 = document.getElementById("open-eye-1");
	const closed1 = document.getElementById("closed-eye-1");
	const open2 = document.getElementById("open-eye-2");
	const closed2 = document.getElementById("closed-eye-2");

	// Masquer les icônes ouvertes au départ
	open1.classList.add("hidden");
	open2.classList.add("hidden");
	// Les icônes fermées restent visibles par défaut
	// closed1.classList.remove("hidden");
	// closed2.classList.remove("hidden");

	return { open1, closed1, open2, closed2 };
}

const { open1, closed1, open2, closed2 } = eyesIcons();

// =========================
// Show / Hide | Password
// =========================
function showHide(input, openIcon, closedIcon) {
	if (input.value.length === 0) return; // rien à afficher si vide

	if (input.type === "password") {
		input.type = "text";
		openIcon.classList.remove("hidden");
		closedIcon.classList.add("hidden");
	} else {
		input.type = "password";
		openIcon.classList.add("hidden");
		closedIcon.classList.remove("hidden");
	}
}

// Click events
open1.addEventListener("click", () => showHide(passwordInput, open1, closed1));
closed1.addEventListener("click", () =>
	showHide(passwordInput, open1, closed1)
);
open2.addEventListener("click", () =>
	showHide(confirmPasswordInput, open2, closed2)
);
closed2.addEventListener("click", () =>
	showHide(confirmPasswordInput, open2, closed2)
);

// =========================
// Show open icon only if user types something
// =========================
function updateIcons(input, openIcon, closedIcon) {
	if (input.value.length > 0) {
		closedIcon.classList.remove("hidden");
		if (input.type === "text") {
			openIcon.classList.remove("hidden");
			closedIcon.classList.add("hidden");
		} else {
			openIcon.classList.add("hidden");
			closedIcon.classList.remove("hidden");
		}
	} else {
		openIcon.classList.add("hidden");
		closedIcon.classList.add("hidden");
		input.type = "password"; // reset type si vidé
	}
}

// Show / hide | icons management
passwordInput.addEventListener("input", () =>
	updateIcons(passwordInput, open1, closed1)
);
confirmPasswordInput.addEventListener("input", () =>
	updateIcons(confirmPasswordInput, open2, closed2)
);

// Generate password | event
generateBtn.addEventListener("mouseout", () => {
	passwordInput.placeholder = "Password";
	confirmPasswordInput.placeholder = "Confirm password";
});

generateBtn.addEventListener("mouseover", () => {
	const passwordGenerated = generatePassword();

	passwordInput.placeholder = passwordGenerated;
	confirmPasswordInput.placeholder = passwordGenerated;
});

generateBtn.addEventListener("click", () => {
	const passwordGenerated = generatePassword();

	passwordInput.value = passwordGenerated;
	confirmPasswordInput.value = passwordGenerated;

	confirmPasswordInput.focus();

	open1.classList.remove("hidden");
	open2.classList.remove("hidden");
});

// =========================
// Submit button event
// =========================
submitBtn.addEventListener("click", async (e) => {
	e.preventDefault();
	clearErrors();

	const firstName = firstNameInput.value.trim();
	const lastName = lastNameInput.value.trim();
	const email = emailInput.value.trim();
	const password = passwordInput.value;
	const confirmPassword = confirmPasswordInput.value;

	if (!firstName)
		return getError(firstNameInput, "Please enter your first name.");
	if (!lastName) return getError(lastNameInput, "Please enter your last name.");
	if (!email || !isValidEmail(email))
		return getError(emailInput, "Please enter a valid email address.");
	if (!password)
		return getError(passwordInput, "Please enter a valid password.");
	if (confirmPassword !== password)
		return getError(confirmPasswordInput, "Passwords do not match.");

	try {
		const res = await fetch("/api/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ firstName, lastName, email, password }),
			credentials: "include", // permet d'envoyer/recevoir le cookie JWT
		});

		// ----- SI ERREUR -----
		if (!res.ok) {
			const error = await res.json(); // on récupère le message JSON
			alert(error.message || "An error occurred");
			return;
		}

		// ----- SI OK -----
		const data = await res.json(); // on récupère la réponse du succès

		alert("✅ Account created successfully!");

		// tu peux stocker des infos non sensibles si tu veux
		localStorage.setItem("inscription", JSON.stringify(data));

		// redirection vers la page souhaitée
		window.location.href = "/pages/form/index1.html";
	} catch (err) {
		console.error(err);
		alert("❌ Network error. Try again later.");
	}
});

// =========================
// Utilities
// =========================
function clearErrors() {
	document.querySelectorAll(".text-red-600").forEach((el) => el.remove());
}

function getError(input, message) {
	const errorMessage = document.createElement("span");
	errorMessage.className = "text-red-600 text-sm block mt-1";
	errorMessage.textContent = message;
	input.insertAdjacentElement("afterend", errorMessage);
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// function placeholdersUpdate(text) {
// 	passwordInput.placeholder = text;
// 	confirmPasswordInput.placeholder = text;
// }
