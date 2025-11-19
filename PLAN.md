# Plan de Formation et de Développement

Bonjour ! C'est une excellente démarche. Tu as déjà mis en place des bases solides et les questions que tu te poses sont exactement les bonnes pour passer au niveau supérieur. En tant que débutant, il est normal de se sentir un peu dépassé par le backend, mais c'est plus simple qu'il n'y paraît quand on le structure bien.

Je te propose un plan d'action détaillé, étape par étape, pour rendre ton application robuste, sécurisée et prête pour le futur.

---

### **Étape 1 : Mettre en place une Vraie Base de Données (Le Pré-requis)**

**Diagnostic :**
Actuellement, ton backend utilise une variable JavaScript (`let db = {};`) comme base de données. C'est super pour prototyper, mais ça a un défaut majeur : **toutes les données sont perdues à chaque redémarrage du serveur**. Pour gérer des utilisateurs et des sessions persistantes, il nous faut une vraie base de données.

**Objectif :**
Remplacer l'objet `db` par une base de données simple et persistante.

**Technologies recommandées :**
1.  **SQLite** : C'est une base de données qui fonctionne avec un simple fichier. Pas de serveur à installer, c'est parfait pour débuter et pour des projets de cette taille.
2.  **Prisma** : C'est un "ORM" (Object-Relational Mapper). En simple, c'est un outil qui va te permettre de parler à ta base de données en écrivant du JavaScript/TypeScript simple, au lieu de requêtes SQL complexes. C'est très moderne et apprécié des développeurs.

**Plan d'action :**
1.  **Installer Prisma et le client Prisma :**
    ```bash
    npm install prisma --save-dev
    npm install @prisma/client
    ```
2.  **Initialiser Prisma dans ton projet :**
    Cette commande va créer un dossier `prisma` avec un fichier `schema.prisma`.
    ```bash
    npx prisma init
    ```
3.  **Définir tes modèles de données :**
    Ouvre `prisma/schema.prisma` et remplace son contenu par ceci. On définit ici à quoi ressemblera un utilisateur (`User`) dans la base de données.

    ```prisma
    // This is your Prisma schema file,
    // learn more about it in the docs: https://pris.ly/d/prisma-schema

    generator client {
      provider = "prisma-client-js"
    }

    datasource db {
      provider = "sqlite"
      url      = "file:./dev.db" // Le fichier de ta base de données
    }

    model User {
      id        Int      @id @default(autoincrement())
      email     String   @unique
      firstName String
      lastName  String?
      password  String
      role      UserRole @default(USER) // Pour la gestion des accès
      createdAt DateTime @default(now())
    }

    // On définit les rôles possibles pour un utilisateur
    enum UserRole {
      USER
      PREMIUM
    }
    ```

4.  **Créer la base de données :**
    Cette commande va lire ton `schema.prisma` et créer le fichier de base de données `dev.db` avec la table `User`.
    ```bash
    npx prisma migrate dev --name init
    ```

---

### **Étape 2 : Gestion de l'Authentification et des Sessions (Tes points 1 & 2)**

**Diagnostic :**
Tu utilises `bcrypt` et les cookies `httpOnly` avec JWT. C'est **excellent** et très sécurisé ! Le point faible est que les données de session (le pour/contre, l'historique) sont gérées principalement sur le frontend avec `localStorage`. On va centraliser ça.

**Objectif :**
1.  Stocker les utilisateurs dans la base de données SQLite.
2.  Lier les sessions de travail (le pour/contre, etc.) à un utilisateur dans la base de données.
3.  Le frontend devient "bête" : il ne fait que stocker le cookie de session et demande tout au backend.

**Plan d'action :**
1.  **Modifier `server.js` pour utiliser Prisma :**
    *   Importe le client Prisma en haut de ton fichier `backend/server.js` :
        ```javascript
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        ```
    *   **Réécris `/api/signup`** pour créer un utilisateur dans la base de données avec `prisma.user.create()`.
    *   **Réécris `/api/login`** pour trouver un utilisateur avec `prisma.user.findUnique()` et vérifier son mot de passe.
    *   Dans le `payload` de ton JWT, inclus l'ID de l'utilisateur et son rôle :
        ```javascript
        const payload = {
            userId: user.id, // TRÈS IMPORTANT
            email: user.email,
            role: user.role, // On ajoute le rôle
        };
        ```

2.  **Centraliser la vérification (Middleware) :**
    Ton `authMiddleware` est bien pensé. Maintenant, il faut l'améliorer et l'utiliser.
    *   Dans `authMiddleware`, après avoir vérifié le token, utilise `prisma` pour récupérer l'utilisateur complet et attache-le à la requête.
        ```javascript
        // ... dans authMiddleware après jwt.verify
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user; // On attache l'objet user entier !
        next();
        ```
    *   Tu pourras maintenant protéger tes routes en ajoutant ce middleware. Par exemple : `app.post("/api/arguments", authMiddleware, (req, res) => { ... });`.

3.  **Lier les données de session à l'utilisateur :**
    *   Ajoute un modèle `Session` dans `schema.prisma` et relance `npx prisma migrate dev`.
        ```prisma
        model Session {
          id        String   @id @default(uuid())
          topic     String
          pros      Json
          cons      Json
          messages  Json
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt
          userId    Int
          user      User     @relation(fields: [userId], references: [id])
        }
        
        // Ajoute ceci dans ton modèle User :
        model User {
          // ... autres champs
          sessions  Session[]
        }
        ```
    *   Quand un utilisateur connecté sauvegarde des données (`/api/arguments`), tu crées/mets à jour une entrée dans la table `Session` liée à son `req.user.id`. Fini le `localStorage` pour les données importantes !

---

### **Étape 3 : Gestion des Droits d'Accès (Ton point 3)**

**Diagnostic :**
Ton idée de 3 états (non-connecté, connecté, premium) est la bonne approche. Ton frontend adapte déjà l'UI, c'est super. Il manque la sécurité côté backend pour s'assurer qu'un utilisateur non-premium ne puisse pas accéder à des fonctions premium.

**Objectif :**
Créer un système de rôles côté backend qui bloque ou autorise l'accès aux fonctionnalités.

**Plan d'action :**
1.  **Le `role` est déjà dans la base de données** (on l'a fait à l'étape 1) et dans le JWT (étape 2).
2.  **Créer un middleware de vérification de rôle :**
    Ce middleware s'utilisera *après* le `authMiddleware`.
    ```javascript
    function checkRole(roleRequired) {
        return (req, res, next) => {
            if (req.user && req.user.role === roleRequired) {
                next(); // L'utilisateur a le bon rôle, on continue
            } else {
                res.status(403).json({ message: "Forbidden: Premium access required." });
            }
        };
    }
    ```
3.  **Utilisation :**
    Imagine une future route pour une fonctionnalité premium. Tu la protégerais comme ça :
    ```javascript
    app.get('/api/super-feature', authMiddleware, checkRole('PREMIUM'), (req, res) => {
        // Seuls les utilisateurs authentifiés ET premium peuvent arriver ici
    });
    ```
4.  **Pour les utilisateurs non-connectés :**
    Leur historique ne sera tout simplement jamais sauvegardé dans la base de données, car ils n'ont pas de `userId`. Leur session reste "volatile". L'approche actuelle où tu caches les boutons d'historique sur le frontend est correcte.

---

### **Étape 4 : Modulariser le Backend (Ton point 4)**

**Diagnostic :**
Ton fichier `server.js` fait tout. C'est difficile à lire et à maintenir quand le projet grandit.

**Objectif :**
Organiser ton code backend en dossiers et fichiers spécialisés.

**Plan d'action :**
1.  **Crée la structure de dossiers suivante dans `/backend` :**
    *   `routes/` : Pour définir les URLs (les "routes").
    *   `controllers/` : Pour la logique de chaque route (gérer `req` et `res`).
    *   `middleware/` : Pour y mettre `authMiddleware` et `checkRole`.
2.  **Exemple de découpage :**
    *   **`backend/routes/auth.routes.js` :**
        ```javascript
        import express from 'express';
        import { signup, login } from '../controllers/auth.controller.js';
        const router = express.Router();
        router.post('/signup', signup);
        router.post('/login', login);
        export default router;
        ```
    *   **`backend/controllers/auth.controller.js` :**
        ```javascript
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        // ... logique de signup et login ici
        export async function signup(req, res) { /* ... */ }
        export async function login(req, res) { /* ... */ }
        ```
    *   **Ton `server.js` devient très simple :**
        ```javascript
        import express from 'express';
        import authRoutes from './routes/auth.routes.js';
        // ... autres imports
        const app = express();
        // ... middleware globaux (cors, express.json)
        app.use('/api/auth', authRoutes); // On dit à Express d'utiliser les routes d'authentification
        // ... app.listen
        ```
Cela rend ton code infiniment plus propre et plus facile à gérer.

---

### **Étape 5 : Nouvelles Fonctionnalités (Ton point 6)**

**Diagnostic :**
Tu veux pouvoir changer la personnalité de l'IA. Cela signifie que le `prompt` système envoyé à ton modèle (`gemma3`) doit être dynamique.

**Objectif :**
Permettre à l'utilisateur de choisir un "prompt" ou une "personnalité" pour l'IA, et le sauvegarder.

**Plan d'action :**
1.  **Ajouter un modèle `Prompt` dans `schema.prisma` :**
    ```prisma
    model Prompt {
      id          Int     @id @default(autoincrement())
      name        String  // ex: "Analyste Objectif", "Avocat du Diable"
      description String
      content     String  @db.Text // Le texte du prompt lui-même
      userId      Int?    // Optionnel: si c'est un prompt custom d'un utilisateur
      user        User?   @relation(fields: [userId], references: [id])
    }
    
    // N'oublie pas d'ajouter `prompts Prompt[]` dans ton modèle User
    // Et de lancer `npx prisma migrate dev`
    ```
2.  **Créer des routes API pour les prompts (`/api/prompts`) :**
    *   `GET /api/prompts` : Lister les prompts par défaut et ceux de l'utilisateur.
    *   `POST /api/prompts` : Créer un nouveau prompt custom (fonctionnalité premium ?).
3.  **Modifier la logique de `createPrompt` :**
    La fonction `createPrompt` dans `server.js` ne sera plus statique. Elle recevra un `promptId` de la part du frontend, ira le chercher en base de données, et construira la requête finale à partir de ça.

---

### **Conclusion**

Ce plan peut paraître long, mais chaque étape est une brique qui s'appuie sur la précédente. Prends ton temps.

1.  **Concentre-toi d'abord à 100% sur la mise en place de SQLite et Prisma (Étape 1).** C'est le plus gros changement, mais celui qui débloquera tout le reste.
2.  Ensuite, adapte ton authentification.
3.  Puis, la modularisation deviendra naturelle.

N'hésite pas à poser des questions à chaque étape. C'est un super projet pour apprendre et tu es sur la bonne voie. Bon courage !
