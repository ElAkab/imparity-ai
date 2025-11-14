export async function checkAuth() {
	try {
		const res = await fetch("/api/me", {
			method: "GET",
			credentials: "include",
		});
		if (!res.ok) throw new Error("Not logged in");
		const data = await res.json();

		// ✅ Utilisateur connecté
		const authButtons = document.getElementById("auth-buttons");
		const userMenu = document.getElementById("user-menu");

		authButtons.classList.add("hidden");
		userMenu.classList.remove("hidden");
	} catch (err) {
		// ⚠️ Non connecté
		const authButtons = document.getElementById("auth-buttons");
		const userMenu = document.getElementById("user-menu");
		const chatInput = document.getElementById("ai-input");

		authButtons.classList.remove("hidden");
		userMenu.classList.add("hidden");
		chatInput.classList.add("hidden");

		const askAuth = document.createElement("a");
		askAuth.href = "/signup";
		askAuth.className =
			"bg-linear-to-r from-blue-900 via-black to-red-900 text-white h-full font-semibold p-3 px-5 border-2 border-black rounded-r-full cursor-pointer transition-all duration-500 active:scale-95 ease-in-out";
	}
}

export async function logoutUser() {
	try {
		const res = await fetch("/api/logout", {
			method: "POST",
			credentials: "include",
		});

		if (!res.ok) throw new Error("Erreur déconnexion");

		window.location.href = "/";
	} catch (e) {
		console.error(e);
	}
}
