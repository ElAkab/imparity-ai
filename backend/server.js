// backend is 50% made by AI. Reviewed and corrected by human, -> me <- 😅.

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

const saltRounds = 10; // Facteur de coût, peut être ajusté
const app = express();
dotenv.config();

app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

let db = {}; // database

function findUser(email) {
	return db[email];
}

// _INSCRIPTION_
app.post("/api/signup", async (req, res) => {
	const { firstName, lastName, email, password } = req.body;

	// vérifier si l'email existe déjà dans la base
	if (findUser(email)) {
		return res.status(409).json({ message: "Email already exists" });
	}

	// hasher le mot de passe avec bcrypt
	const hashedPassword = await hashPassword(password);

	// créer un nouvel utilisateur
	const user = {
		firstName,
		lastName,
		email,
		password: hashedPassword,
		createdAt: new Date(),
	};

	// sauvegarder dans la "db"
	db[email] = user;

	// ne renvoyer que les infos non sensibles
	const safeUser = {
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		createdAt: user.createdAt,
	};

	return res.status(201).json(safeUser);
});

// _Connexion_
app.post("/api/login", async (req, res) => {
	const { email, password } = req.body;

	const user = findUser(email);
	if (!user) {
		return res.status(404).json({ message: "Email not found.." });
	}

	const isPasswordValid = await bcrypt.compare(password, user.password); // Ne "dé-hash" pas => hash password pour comparer
	if (!isPasswordValid) {
		return res.status(401).json({ message: "Invalid password.." });
	}

	const payload = {
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
	};

	const token = jwt.sign(payload, process.env.SECRET_JWT, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});

	// Au lieu de : return res.json({ message: "Login successful", token: token });
	// Faites ceci :
	res.cookie("token", token, {
		httpOnly: true, // Empêche l'accès via JavaScript
		secure: process.env.NODE_ENV === "production", // N'envoie le cookie que sur HTTPS en production
		sameSite: "strict", // Protection contre les attaques CSRF
		maxAge: 1000 * 60 * 60, // 1 heure
	});

	return res.json({ message: "Login successful" });
});

app.get("/users", (req, res) => {
	console.log(req.headers);
	res.json(db);
});

app.get("/api/me", (req, res) => {
	const token = req.cookies.token;
	if (!token) return res.status(401).json({ message: "Not authenticated" });

	try {
		const decoded = jwt.verify(token, process.env.SECRET_JWT);
		res.json({ email: decoded.email });
	} catch {
		return res.status(403).json({ message: "Invalid or expired token" });
	}
});

// _Déconnexion_
app.delete("/api/log-out", (req, res) => {
	res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
	res.json({ message: "Logged out" });
});

// Password hash function
async function hashPassword(plainPassword) {
	const salt = await bcrypt.genSalt(saltRounds);
	const hashedPassword = await bcrypt.hash(plainPassword, salt);
	// console.log("Mot de passe haché :", hashedPassword);
	return hashedPassword;
}

// _Middleware_
function authMiddleware(req, res, next) {
	// 1 - Store token (stored in a cookie)
	const token = req.cookies.token;
	console.log(token);
	// 2 - If token is not present, return 401 "Unauthorized"
	if (!token) return res.status(401).json({ message: "No token :(" });

	// 3 - Else we can try to test its compatibility
	try {
		// 4 - Store decoded user from token
		const decoded = jwt.verify(token, process.env.SECRET_JWT);
		req.user = decoded; // 5 - Link on the concerned user
		next(); // 6 - Then continue the request
	} catch {
		// 7 - If the token is invalid, return 403 "Invalid token"
		return res.status(403).json({ message: "Invalid token" });
	}
}

// Routes for managing arguments
app.get("/api/arguments", (req, res) => {
	const defaultSession = db["default"] || {
		topic: "",
		pros: [],
		cons: [],
		followUp: [],
		messages: [],
	};
	res.json(defaultSession);
});

app.post("/api/arguments", (req, res) => {
	const { sessionId, topic, pros, cons, followUp, messages } = req.body;
	if (!sessionId) return res.status(400).json({ error: "Session manquante" });

	db[sessionId] = {
		topic,
		pros: Array.isArray(pros) ? pros : [],
		cons: Array.isArray(cons) ? cons : [],
		followUp: Array.isArray(followUp) ? followUp : [],
		messages: Array.isArray(messages) ? messages : [],
	};

	res.json({ success: true, db: db[sessionId] });
});

app.delete("/api/arguments", (req, res) => {
	db = {
		topic: "",
		pros: [],
		cons: [],
		followUp: [],
		messages: [],
	};
	res.json({ message: "Arguments reset successfully." });
});

// Route for analyzing with streaming response
app.post("/api/analyze-stream", async (req, res) => {
	try {
		let evaluation = req.body;
		const prompt = createPrompt(evaluation);

		// Configure headers for SSE
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		const response = await fetch("http://localhost:11434/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "gemma3",
				prompt: prompt,
				stream: true, // Active the streaming
			}),
		});

		// Stream the response
		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n").filter((line) => line.trim() !== "");

			for (const line of lines) {
				try {
					const data = JSON.parse(line);
					if (data.response) {
						// Send each chunk as SSE
						res.write(`data: ${JSON.stringify({ text: data.response })}\n\n`);
					}
				} catch (e) {
					console.error("Error parsing:", e);
				}
			}
		}

		// Indicate the end of the stream
		res.write("data: [DONE]\n\n");
		res.end();
	} catch (error) {
		console.error("Error : ", error);
		res.write(
			`data: ${JSON.stringify({ error: "Error during analysis" })}\n\n`
		);
		res.end();
	}
});

// Keep the non-streaming route for compatibility
app.post("/api/analyze", async (req, res) => {
	try {
		let evaluation = req.body;
		const prompt = createPrompt(evaluation);

		const response = await fetch("http://localhost:11434/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "gemma3",
				prompt: prompt,
				stream: false,
			}),
		});

		const data = await response.json();
		const conclusion = data.response || "Empty response";
		res.json({ conclusion });
	} catch (error) {
		console.error("Error : ", error);
		res.status(500).json({ error: "Error during analysis" });
	}
});

function createPrompt(evaluation) {
	// If there's a follow-up question, focus only on that
	if (evaluation.followUp && evaluation.followUp.trim()) {
		return `Tu es un assistant IA. L'utilisateur discute d'une analyse sur le sujet "${
			evaluation.topic
		}", de ses avantages "${evaluation.pros
			.map((p) => p.text)
			.join(", ")}" et ses inconvénients "${evaluation.cons
			.map((p) => p.text)
			.join(", ")}".
        La question de l'utilisateur (auquel il faut répondre) est : ${
					evaluation.followUp
				}

        Réponds uniquement à cette question.`;
	}

	// Default prompt for full analysis
	return `Tu es un analyste objectif. Analyse le sujet suivant en pesant le pour et le contre.
    Utilise le format Markdown pour structurer ta réponse.

    # Analyse : ${evaluation.topic}

    ## Arguments Pour
    ${evaluation.pros.map((p) => `* ${p.text}`).join("\n")}

    ## Arguments Contre
    ${evaluation.cons.map((c) => `* ${c.text}`).join("\n")}

    ## Analyse attendue
    1. Synthèse des arguments principaux
    2. Points d'équilibre
    3. Conclusion

    Sois objectif et juste. Fais une réponse pas trop longue, en la structurant avec des titres (##), des listes (*) et du texte en **gras** ou *italique* quand nécessaire.`;
}

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server started on http://localhost:${PORT}`);
});
