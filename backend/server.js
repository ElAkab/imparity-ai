import path from "path";
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

/* ----- SQLite setup ----- */
const db = new Database("data.sqlite");

// Users table
db.prepare(
	`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  is_premium INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`
).run();

// Sessions table
db.prepare(
	`
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER,
  data TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`
).run();

/* ----- JWT helpers ----- */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
	return jwt.verify(token, JWT_SECRET);
}

/* ----- Middlewares ----- */
// Authenticated user
function authMiddleware(req, res, next) {
	const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
	if (!token) return res.status(401).json({ error: "Unauthorized" });

	try {
		const payload = verifyToken(token);
		req.userId = payload.userId;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
}

// Premium user
function premiumMiddleware(req, res, next) {
	const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
	if (!token) return res.status(401).json({ error: "Unauthorized" });
	try {
		const payload = verifyToken(token);
		const user = db
			.prepare("SELECT * FROM users WHERE id=?")
			.get(payload.userId);
		if (!user || !user.is_premium)
			return res.status(403).json({ error: "Premium only" });
		req.user = user;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
}

/* ----- Auth routes ----- */
app.post("/api/signup", async (req, res) => {
	try {
		const { firstName, lastName, email, password } = req.body;
		if (!email || !password)
			return res.status(400).json({ error: "Missing fields" });

		const existing = db
			.prepare("SELECT id FROM users WHERE email = ?")
			.get(email);
		if (existing) return res.status(409).json({ error: "Email already used" });

		const hash = await argon2.hash(password);
		const info = db
			.prepare(
				"INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)"
			)
			.run(firstName || "", lastName || "", email, hash);

		const token = signToken({ userId: info.lastInsertRowid });
		res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
		res.json({ success: true, userId: info.lastInsertRowid });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/api/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password)
			return res.status(400).json({ error: "Missing fields" });

		const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
		if (!user || !(await argon2.verify(user.password_hash, password))) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const token = signToken({ userId: user.id });
		res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
		res.json({ success: true, userId: user.id });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/api/logout", (req, res) => {
	res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
	res.json({ success: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
	const user = db
		.prepare(
			"SELECT id, first_name, last_name, email, is_premium FROM users WHERE id=?"
		)
		.get(req.userId);
	res.json({ loggedIn: true, user });
});

/* ----- Arguments routes ----- */
// Public (non-connecté) → pas sauvegarde côté serveur
app.post("/api/arguments/public", (req, res) => {
	const { topic, pros, cons, followUp } = req.body;
	if (!topic) return res.status(400).json({ error: "Missing topic" });

	// Retourne juste l'objet, pas de session côté serveur
	res.json({
		topic,
		pros: pros || [],
		cons: cons || [],
		followUp: followUp || [],
	});
});

// Authenticated → sauvegarde par utilisateur
app.get("/api/arguments", authMiddleware, (req, res) => {
	const sessionId = `${req.userId}:default`;
	const row = db
		.prepare("SELECT data FROM sessions WHERE session_id=?")
		.get(sessionId);
	if (!row)
		return res.json({
			topic: "",
			pros: [],
			cons: [],
			followUp: [],
			messages: [],
		});
	res.json(JSON.parse(row.data));
});

app.post("/api/arguments", authMiddleware, (req, res) => {
	const { topic, pros, cons, followUp, messages } = req.body;
	const sessionId = `${req.userId}:default`;

	const dataObj = {
		topic,
		pros: pros || [],
		cons: cons || [],
		followUp: followUp || [],
		messages: messages || [],
	};
	db.prepare(
		"INSERT OR REPLACE INTO sessions (session_id, user_id, data, updated_at) VALUES (?, ?, ?, datetime('now'))"
	).run(sessionId, req.userId, JSON.stringify(dataObj));

	res.json({ success: true, sessionId, data: dataObj });
});

// Delete session
app.delete("/api/arguments", authMiddleware, (req, res) => {
	const sessionId = `${req.userId}:default`;
	db.prepare("DELETE FROM sessions WHERE session_id=?").run(sessionId);
	res.json({ message: "Session reset." });
});

/* ----- Analyze routes ----- */
// Public → limité, pas streaming
app.post("/api/analyze/public", async (req, res) => {
	try {
		const evaluation = req.body;
		const prompt = createPrompt(evaluation);

		const response = await fetch("http://localhost:11434/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: "gemma3", prompt, stream: false }),
		});

		const data = await response.json();
		res.json({ conclusion: data.response });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Analysis failed" });
	}
});

// Authenticated → complet, streaming possible
app.post("/api/analyze", authMiddleware, async (req, res) => {
	try {
		const evaluation = req.body;
		const prompt = createPrompt(evaluation);

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		const response = await fetch("http://localhost:11434/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: "gemma3", prompt, stream: true }),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const chunk = decoder.decode(value);
			const lines = chunk.split("\n").filter((l) => l.trim() !== "");
			for (const line of lines) {
				try {
					const data = JSON.parse(line);
					if (data.response) {
						res.write(`data: ${JSON.stringify({ text: data.response })}\n\n`);
					}
				} catch {}
			}
		}
		res.write("data: [DONE]\n\n");
		res.end();
	} catch (err) {
		console.error(err);
		res.write(
			`data: ${JSON.stringify({ error: "Error during analysis" })}\n\n`
		);
		res.end();
	}
});

/* ----- Premium analyze route (optionnel) ----- */
app.post("/api/analyze/premium", premiumMiddleware, async (req, res) => {
	// Exemple d’extension future pour utilisateurs premium
	res.json({ message: "Premium analysis" });
});

/* ----- Prompt helper ----- */
function createPrompt(evaluation) {
	if (evaluation.followUp && evaluation.followUp.trim()) {
		return `Tu es un assistant IA. L'utilisateur discute d'une analyse sur le sujet "${
			evaluation.topic
		}", de ses avantages "${evaluation.pros
			.map((p) => p.text)
			.join(", ")}" et ses inconvénients "${evaluation.cons
			.map((p) => p.text)
			.join(", ")}".
La question de l'utilisateur est : ${evaluation.followUp}
Réponds uniquement à cette question.`;
	}

	return `Tu es un analyste objectif. Analyse le sujet suivant en pesant le pour et le contre.
# Analyse : ${evaluation.topic}
## Arguments Pour
${evaluation.pros.map((p) => `* ${p.text}`).join("\n")}
## Arguments Contre
${evaluation.cons.map((c) => `* ${c.text}`).join("\n")}
## Analyse attendue
1. Synthèse des arguments principaux
2. Points d'équilibre
3. Conclusion`;
}

/* ----- Start server ----- */
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server started on http://localhost:${PORT}`);
});
