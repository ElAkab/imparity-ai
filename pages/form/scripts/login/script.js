// Login script

// =========================
// Initialization
// =========================
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");

const open1 = document.getElementById("open-eye-1");
const closed1 = document.getElementById("closed-eye-1");

// =========================
// Show / Hide | Password
// =========================
function showHide(input, openIcon, closedIcon) {
	if (input.value.length === 0) return;

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

// Show / hide | click events
open1.addEventListener("click", () => showHide(passwordInput, open1, closed1));
closed1.addEventListener("click", () =>
	showHide(passwordInput, open1, closed1)
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

// =========================
// Submit button event
// =========================
submitBtn.addEventListener("click", async (e) => {
	e.preventDefault();
	clearErrors();

	const email = emailInput.value.trim();
	const password = passwordInput.value;
	if (!email)
		return getError(emailInput, "Please enter a valid email address.");
	if (!password)
		return getError(passwordInput, "Please enter a valid password.");

	try {
		const res = await fetch("/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
			credentials: "include", // pour envoyer/recevoir le cookie JWT
		});

		const data = await res.json();

		if (!res.ok) {
			// ⚡ Si email déjà pris, res.status sera 409
			if (res.status === 409) {
				return alert(data.error); // "Email already used"
			}
			return alert(data.error || "Something went wrong");
		}

		alert("✅ Connected !");

		window.location.href = "/index.html";
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
	errorMessage.className = "text-red-600 text-sm block -my-3";
	errorMessage.textContent = message;
	input.insertAdjacentElement("afterend", errorMessage);
}
