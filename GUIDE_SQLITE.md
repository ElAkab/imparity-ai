# Guide Pratique : Intégrer SQLite et Prisma à votre Backend

Bonjour ! Ce guide a pour but de t'accompagner pas à pas dans la migration de ton système d'authentification : on va passer de ta base de données "en mémoire" à une vraie base de données **SQLite** persistante, en utilisant **Prisma** comme assistant.

Suis chaque étape dans l'ordre. Pour chaque étape, je te fournis l'objectif, l'action à réaliser dans ton code, l'explication et comment tester ton progrès avec ton fichier `backend/requests.rest`.

---

## Étape 0 : Préparation de l'Environnement

L'objectif ici est de mettre en place les fondations. On installe les outils et on crée le fichier de base de données.

#### Actions :

1.  **Ouvre un terminal** à la racine de ton projet `imparity-ai` et exécute les commandes suivantes pour installer Prisma :
    ```bash
    npm install prisma --save-dev
    npm install @prisma/client
    ```

2.  **Initialise Prisma** dans ton projet. Cette commande va créer un dossier `prisma` et un fichier `.env`.
    ```bash
    npx prisma init
    ```

3.  **Configure ton "Schéma"**. Ouvre le nouveau fichier `prisma/schema.prisma` et remplace **tout son contenu** par le code ci-dessous. C'est ici qu'on décrit la structure de nos données.

    ```prisma
    generator client {
      provider = "prisma-client-js"
    }

    datasource db {
      provider = "sqlite"
      url      = "file:./dev.db" // Indique que notre DB sera un fichier local
    }

    model User {
      id        Int      @id @default(autoincrement())
      email     String   @unique
      firstName String
      lastName  String?
      password  String
      role      UserRole @default(USER)
      createdAt DateTime @default(now())
    }

    enum UserRole {
      USER
      PREMIUM
    }
    ```

4.  **Crée la base de données**. Cette commande est magique : elle va lire ton `schema.prisma`, créer le fichier de base de données `dev.db` avec la table `User`, et générer le client Prisma (ton assistant personnalisé).
    ```bash
    npx prisma migrate dev --name init
    ```
    Quand il te pose une question, réponds simplement "y" (yes).

#### Explication :

À ce stade, tu as un nouveau fichier `prisma/dev.db` dans ton projet. C'est ta base de données, pour l'instant vide. Tu as aussi tout ce qu'il faut pour que ton code Node.js puisse communiquer avec elle.

#### Test (Optionnel mais recommandé) :

Pour visualiser ta nouvelle base de données, exécute cette commande :
```bash
npx prisma studio
```
Cela va ouvrir une page dans ton navigateur où tu peux voir tes tables et leurs données. Pour l'instant, la table `User` est vide. C'est normal.

---

## Étape 1 : Nettoyer l'Ancien Système dans `server.js`

On prépare le terrain dans `backend/server.js` en enlevant l'ancien code.

#### Actions :

1.  Ouvre ton fichier `backend/server.js`.
2.  **Supprime** ces deux morceaux de code :
    ```javascript
    let db = {}; // database
    ```
    et
    ```javascript
    function findUser(email) {
    	return db[email];
    }
    ```
3.  **Ajoute** en haut du fichier, avec les autres `import`, le code pour initialiser Prisma :
    ```javascript
    import { PrismaClient } from "@prisma/client";

    const prisma = new PrismaClient();
    ```

#### Explication :

On a retiré la base de données "en mémoire" (`db`) et sa fonction de recherche. On les remplace par une instance de notre assistant Prisma, qui est maintenant prêt à recevoir nos ordres.

---

## Étape 2 : Adapter la Route d'Inscription (`/api/signup`)

On va maintenant dire à la route `signup` d'enregistrer les utilisateurs dans la base de données SQLite.

#### Actions :

Dans `backend/server.js`, remplace ta route `app.post("/api/signup", ...)` par celle-ci :

```javascript
// _INSCRIPTION_
app.post("/api/signup", async (req, res) => {
	const { firstName, lastName, email, password } = req.body;

	// ÉTAPE 1: vérifier si l'email existe déjà avec Prisma
	const existingUser = await prisma.user.findUnique({
		where: { email: email },
	});

	if (existingUser) {
		return res.status(409).json({ message: "Email already exists" });
	}

	// ÉTAPE 2: hasher le mot de passe (cette partie ne change pas)
	const hashedPassword = await hashPassword(password);

	// ÉTAPE 3: créer un nouvel utilisateur dans la base de données avec Prisma
	const user = await prisma.user.create({
		data: {
			firstName,
			lastName,
			email,
			password: hashedPassword,
		},
	});

	// ÉTAPE 4: renvoyer une réponse (ne renvoie jamais le mot de passe)
	const safeUser = {
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		createdAt: user.createdAt,
	};

	return res.status(201).json(safeUser);
});
```

#### Explication :

-   Au lieu de `findUser(email)`, on utilise `await prisma.user.findUnique(...)`. C'est un ordre clair à Prisma pour qu'il cherche dans la table `User` un enregistrement unique correspondant à l'email.
-   Au lieu de `db[email] = user`, on utilise `await prisma.user.create({ data: ... })`. Prisma prend l'objet `data` et s'occupe de l'insérer correctement dans la base de données.

#### Test :

1.  **Démarre ton serveur** backend : `node backend/server.js`.
2.  Ouvre ton fichier `backend/requests.rest`.
3.  Place ton curseur sur la requête `POST http://localhost:3000/api/signup` et clique sur "Send Request".
    - **Premier essai :** Tu devrais recevoir une réponse `Status: 201 Created` avec les infos de l'utilisateur. **Félicitations, ton utilisateur est dans la base de données !**
    - **Deuxième essai (sans rien changer) :** Relance la même requête. Tu devrais maintenant recevoir `Status: 409 Conflict` avec le message "Email already exists". Cela prouve que ta base de données est persistante !
4.  **Bonus :** Arrête ton serveur, relance `npx prisma studio` et regarde la table `User`. Tu y verras l'utilisateur que tu viens de créer.

---

## Étape 3 : Adapter la Route de Connexion (`/api/login`)

Maintenant, faisons en sorte que la connexion vérifie les informations dans la base de données.

#### Actions :

Dans `backend/server.js`, remplace ta route `app.post("/api/login", ...)` par celle-ci :

```javascript
// _Connexion_
app.post("/api/login", async (req, res) => {
	const { email, password } = req.body;

	// ÉTAPE 1: trouver l'utilisateur dans la DB avec Prisma
	const user = await prisma.user.findUnique({
		where: { email: email },
	});

	// Si aucun utilisateur n'est trouvé, ou si le mot de passe est invalide
	if (!user || !(await bcrypt.compare(password, user.password))) {
		return res.status(401).json({ message: "Invalid email or password" });
	}

	// ÉTAPE 2: Mettre à jour le contenu du JWT (le "payload")
	const payload = {
		userId: user.id, // <-- TRÈS IMPORTANT pour la suite
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		role: user.role, // <-- TRÈS UTILE pour la suite
	};

	const token = jwt.sign(payload, process.env.SECRET_JWT, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});

	res.cookie("token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 1000 * 60 * 60, // 1 heure
	});

	return res.json({ message: "Login successful" });
});
```

#### Explication :

-   On utilise à nouveau `prisma.user.findUnique` pour récupérer l'utilisateur.
-   On a simplifié la logique de vérification. Si `user` est `null` ou si `bcrypt.compare` renvoie `false`, on envoie la même erreur. C'est plus sécurisé de ne pas dire *spécifiquement* si c'est l'email ou le mot de passe qui est faux.
-   **Le plus important :** On enrichit le `payload` du JWT avec `user.id` et `user.role`. Cela signifie que le cookie de session contiendra maintenant l'identifiant unique de l'utilisateur, ce qui nous permettra plus tard de lier des données (comme l'historique des conversations) à cet utilisateur précis.

#### Test :

1.  **Redémarre ton serveur** backend.
2.  Dans `backend/requests.rest`, exécute la requête `POST http://localhost:3000/api/login` avec les identifiants que tu as utilisés pour l'inscription.
    - **Essai correct :** Tu devrais recevoir `Status: 200 OK` avec le message "Login successful". Le cookie de session est maintenant dans ton client REST.
    - **Essai avec un faux mot de passe :** Change le mot de passe dans la requête et relance. Tu devrais recevoir `Status: 401 Unauthorized`.

---

## Étape 4 : Mettre à Jour les Routes de Test

Enfin, mettons à jour la route `/users` pour qu'elle lise la vraie base de données.

#### Actions :

Remplace ta route `app.get("/users", ...)` par celle-ci :

```javascript
app.get("/users", async (req, res) => {
	// On demande à Prisma tous les utilisateurs
	const users = await prisma.user.findMany({
		// On sélectionne seulement les champs qu'on veut montrer
		// pour ne jamais exposer les mots de passe hashés !
		select: {
			id: true,
			email: true,
			firstName: true,
			createdAt: true,
			role: true,
		},
	});
	res.json(users);
});
```

#### Explication :

`prisma.user.findMany()` est l'ordre pour "donne-moi toutes les entrées de la table User". On utilise `select` pour spécifier exactement quels champs on veut récupérer, c'est une bonne pratique de sécurité.

#### Test :

1.  **Redémarre ton serveur** backend.
2.  Dans `backend/requests.rest`, exécute la requête `GET http://localhost:3000/users`.
3.  Tu devrais voir une liste JSON contenant l'utilisateur (ou les utilisateurs) que tu as créé, mais sans le champ `password`.

---

### Conclusion

Félicitations ! Tu as franchi la plus grande étape. Ton système d'authentification ne dépend plus d'une variable temporaire, mais d'une base de données de qualité professionnelle, simple et robuste. Ton application se souviendra de tes utilisateurs même après un redémarrage.

La prochaine étape, quand tu seras prêt, sera de faire la même chose pour la route `/api/arguments` en liant les arguments à l'`userId` qui se trouve maintenant dans ton token JWT. Mais pour l'instant, savoure cette victoire !
