
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.length < 32) {
  console.error("JWT_SECRET doit contenir au moins 32 caractères dans .env");
  process.exit(1);
}

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "cyberquiz",
  waitForConnections: true,
  connectionLimit: 10,
});

async function initialiserTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_comptes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pseudo VARCHAR(60) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      mot_de_passe VARCHAR(255) NOT NULL,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions_vues (
      utilisateur_id INT NOT NULL,
      question_id INT NOT NULL,
      vue_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (utilisateur_id, question_id),
      FOREIGN KEY (utilisateur_id)
        REFERENCES quiz_comptes(id)
        ON DELETE CASCADE,
      FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE
    )
  `);
}

function lireJSON(valeur) {
  if (Array.isArray(valeur)) return valeur;

  if (typeof valeur === "string") {
    try {
      const resultat = JSON.parse(valeur);
      return Array.isArray(resultat) ? resultat : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normaliser(valeur) {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function creerToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id },
    SECRET,
    { expiresIn: "30d" }
  );
}

function authentifier(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Connecte-toi pour continuer.",
    });
  }

  try {
    req.utilisateur = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Session expirée. Reconnecte-toi.",
    });
  }
}

// INSCRIPTION
app.post("/api/register", async (req, res) => {
  try {
    const { pseudo, email, password } = req.body;

    const nom = String(pseudo || "").trim();
    const adresse = String(email || "").trim().toLowerCase();

    if (
      nom.length < 2 ||
      nom.length > 60 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "Pseudo (2 à 60 caractères), e-mail valide et mot de passe d'au moins 8 caractères requis.",
      });
    }

    const [existant] = await db.execute(
      "SELECT id FROM quiz_comptes WHERE email = ?",
      [adresse]
    );

    if (existant.length > 0) {
      return res.status(409).json({
        message: "Cet e-mail possède déjà un compte.",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [resultat] = await db.execute(
      `INSERT INTO quiz_comptes (pseudo, email, mot_de_passe)
       VALUES (?, ?, ?)`,
      [nom, adresse, hash]
    );

    const utilisateur = {
      id: resultat.insertId,
      pseudo: nom,
      email: adresse,
    };

    res.status(201).json({
      token: creerToken(utilisateur),
      utilisateur,
    });
  } catch (erreur) {
    console.error(erreur);

    res.status(500).json({
      message: "Impossible de créer le compte.",
    });
  }
});

// CONNEXION
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [comptes] = await db.execute(
      "SELECT * FROM quiz_comptes WHERE email = ?",
      [String(email || "").trim().toLowerCase()]
    );

    const compte = comptes[0];

    if (
      !compte ||
      typeof password !== "string" ||
      !(await bcrypt.compare(password, compte.mot_de_passe))
    ) {
      return res.status(401).json({
        message: "E-mail ou mot de passe incorrect.",
      });
    }

    const utilisateur = {
      id: compte.id,
      pseudo: compte.pseudo,
      email: compte.email,
    };

    res.json({
      token: creerToken(utilisateur),
      utilisateur,
    });
  } catch (erreur) {
    console.error(erreur);

    res.status(500).json({
      message: "Erreur de connexion.",
    });
  }
});

// RESTAURER LA SESSION
app.get("/api/me", authentifier, async (req, res) => {
  try {
    const [comptes] = await db.execute(
      "SELECT id, pseudo, email FROM quiz_comptes WHERE id = ?",
      [req.utilisateur.id]
    );

    if (!comptes.length) {
      return res.status(401).json({
        message: "Compte introuvable.",
      });
    }

    res.json({ utilisateur: comptes[0] });
  } catch {
    res.status(500).json({
      message: "Erreur de session.",
    });
  }
});

// TEST MYSQL
app.get("/api/test", async (req, res) => {
  try {
    const [resultat] = await db.query(
      "SELECT COUNT(*) AS total FROM questions"
    );

    res.json({
      message: "Connexion MySQL réussie !",
      totalQuestions: resultat[0].total,
    });
  } catch (erreur) {
    console.error(erreur);

    res.status(500).json({
      message: "Erreur de connexion MySQL",
    });
  }
});

// RÉCUPÉRER 10 QUESTIONS JAMAIS VUES
app.get("/api/questions", authentifier, async (req, res) => {
  const { theme, niveau } = req.query;

  if (
    !["Cyber", "Fullstack"].includes(theme) ||
    !["Facile", "Moyen", "Difficile"].includes(niveau)
  ) {
    return res.status(400).json({
      message: "Thème ou niveau invalide.",
    });
  }

  let connexion;

  try {
    connexion = await db.getConnection();
    await connexion.beginTransaction();

    // Bloque deux demandes simultanées pour ce compte.
    await connexion.execute(
      "SELECT id FROM quiz_comptes WHERE id = ? FOR UPDATE",
      [req.utilisateur.id]
    );

    const [lignes] = await connexion.execute(
      `SELECT q.id, q.theme, q.niveau, q.type,
              q.titre, q.reponses
       FROM questions q
       WHERE q.theme = ?
         AND q.niveau = ?
         AND NOT EXISTS (
           SELECT 1
           FROM quiz_questions_vues v
           WHERE v.question_id = q.id
             AND v.utilisateur_id = ?
         )
       ORDER BY RAND()
       LIMIT 10`,
      [theme, niveau, req.utilisateur.id]
    );

    if (lignes.length > 0) {
      const valeurs = lignes.map(() => "(?, ?)").join(", ");
      const parametres = lignes.flatMap((question) => [
        req.utilisateur.id,
        question.id,
      ]);

      await connexion.execute(
        `INSERT INTO quiz_questions_vues
         (utilisateur_id, question_id)
         VALUES ${valeurs}`,
        parametres
      );
    }

    await connexion.commit();

    const questions = lignes.map((q) => ({
      id: q.id,
      theme: q.theme,
      niveau: q.niveau,
      type: q.type,
      titre: q.titre,
      reponses: lireJSON(q.reponses),
    }));

    res.json(questions);
  } catch (erreur) {
    if (connexion) await connexion.rollback();

    console.error(erreur);

    res.status(500).json({
      message: "Impossible de charger les questions.",
    });
  } finally {
    if (connexion) connexion.release();
  }
});

// VÉRIFIER UNE RÉPONSE
app.post("/api/verifier", authentifier, async (req, res) => {
  try {
    const { questionId, reponse } = req.body;

    if (!Number.isInteger(questionId)) {
      return res.status(400).json({
        message: "Question invalide.",
      });
    }

    const [lignes] = await db.execute(
      `SELECT q.type, q.reponses, q.bonnes_reponses
       FROM questions q
       INNER JOIN quiz_questions_vues v
         ON v.question_id = q.id
       WHERE q.id = ?
         AND v.utilisateur_id = ?`,
      [questionId, req.utilisateur.id]
    );

    if (!lignes.length) {
      return res.status(404).json({
        message: "Question introuvable dans ton historique.",
      });
    }

    const question = lignes[0];
    const bonnes = lireJSON(question.bonnes_reponses);

    if (!bonnes.length) {
      return res.status(422).json({
        message: "Correction indisponible.",
      });
    }

    let correct = false;

    if (question.type === "multiple") {
      if (Array.isArray(reponse)) {
        const attendues = [...new Set(bonnes.map(normaliser))];
        const recues = [...new Set(reponse.map(normaliser))];
        const options = lireJSON(question.reponses).map(normaliser);

        correct =
          recues.length === attendues.length &&
          recues.every(
            (valeur) =>
              options.includes(valeur) &&
              attendues.includes(valeur)
          );
      }
    } else if (typeof reponse === "string") {
      const saisie = normaliser(reponse);

      if (question.type === "texte") {
        correct =
          saisie.length > 0 &&
          bonnes.some((bonne) => normaliser(bonne) === saisie);
      } else {
        const options =
          question.type === "vraiFaux"
            ? ["Vrai", "Faux"]
            : lireJSON(question.reponses);

        correct =
          options.some((option) => normaliser(option) === saisie) &&
          bonnes.some((bonne) => normaliser(bonne) === saisie);
      }
    }

    res.json({
      correct,
      bonnesReponses: bonnes,
    });
  } catch (erreur) {
    console.error(erreur);

    res.status(500).json({
      message: "Erreur pendant la correction.",
    });
  }
});

async function demarrer() {
  try {
    await initialiserTables();

    app.listen(PORT, () => {
      console.log(
        `CyberQuiz démarré sur http://localhost:${PORT}`
      );
    });
  } catch (erreur) {
    console.error("Impossible de démarrer :", erreur);
    process.exit(1);
  }
}

demarrer();
