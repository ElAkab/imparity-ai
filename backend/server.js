// backend is 75% made by AI. Reviewed and corrected by human, me 😅.

import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

let db = {}; // database

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
	// Exemple si tu stockes tout dans un fichier ou une variable
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
		const evaluation = req.body;
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
					console.error("Erreur parsing:", e);
				}
			}
		}

		// Indicate the end of the stream
		res.write("data: [DONE]\n\n");
		res.end();
	} catch (error) {
		console.error("Erreur:", error);
		res.write(
			`data: ${JSON.stringify({ error: "Erreur lors de l'analyse" })}\n\n`
		);
		res.end();
	}
});

// Keep the non-streaming route for compatibility
app.post("/api/analyze", async (req, res) => {
	try {
		const evaluation = req.body;
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
		const conclusion = data.response || "Réponse vide";
		res.json({ conclusion });
	} catch (error) {
		console.error("Erreur:", error);
		res.status(500).json({ error: "Erreur lors de l'analyse" });
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
	console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
