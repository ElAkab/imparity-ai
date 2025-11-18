// utils/isAuth.js
import { evaluation } from "./appState";

export async function isAuth() {
	// 1. cookie-parser = lire les cookies côté serveur.
	// 2. JWT peut être stocké dans un cookie HTTP-only, donc plus sécurisé.
	// 3. credentials: "include" côté fetch = envoie automatique des cookies.
	// 4. Plus besoin de localStorage pour l’authentification.
	try {
		const res = await fetch("/api/me", {
			method: "GET",
			credentials: "include",
		});

		evaluation.isAuthenticated = res.ok; // true si token dans cookies existe
		return evaluation.isAuthenticated;
	} catch (error) {
		evaluation.isAuthenticated = false; // false sinon
	}
}
