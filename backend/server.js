
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET manque dans backend/.env");
}

app.use(cors());
app.use(express.json({ limit: "20kb" }));

const niveaux = ["Facile", "Moyen", "Difficile"];

// =====================================
// CORRECTION GRATUITE DES RÉPONSES
// =====================================

function normaliser(texte) {
  return String(texte)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mots peu importants pour comparer le sens
const motsInutiles = new Set([
  "le", "la", "les", "un", "une", "des",
  "de", "du", "d", "a", "au", "aux",
  "en", "dans", "sur", "par", "pour",
  "avec", "et", "ou", "que", "qui",
  "est", "sont", "etre", "avoir",
  "il", "elle", "on", "nous", "vous",
  "je", "tu", "mon", "ma", "mes",
  "ton", "ta", "tes", "son", "sa",
  "ses", "ce", "cette", "ces",
  "cela", "ca", "c", "l",
  "permet", "permettre", "sert",
  "faire", "fait", "afin"
]);

// Groupes de mots ayant un sens proche
const synonymes = {
  proteger: [
    "proteger", "protection", "securiser",
    "securite", "defendre", "preserver"
  ],

  compte: [
    "compte", "profil", "session"
  ],

  pirate: [
    "pirate", "pirater", "piratage",
    "hacker", "hackeur", "intrus"
  ],

  acces: [
    "acces", "connexion", "entrer",
    "acceder", "intrusion"
  ],

  voler: [
    "voler", "vol", "derober",
    "recuperer", "subtiliser"
  ],

  donnees: [
    "donnees", "informations", "infos",
    "documents", "fichiers"
  ],

  motdepasse: [
    "motdepasse", "password",
    "identifiant", "identifiants"
  ],

  bloquer: [
    "bloquer", "empecher", "interdire",
    "stopper", "refuser"
  ],

  detecter: [
    "detecter", "reperer", "identifier",
    "trouver", "reconnaitre"
  ],

  supprimer: [
    "supprimer", "effacer", "retirer",
    "eliminer", "enlever"
  ],

  sauvegarder: [
    "sauvegarder", "sauvegarde",
    "copie", "copier", "conserver"
  ],

  chiffrer: [
    "chiffrer", "chiffrement",
    "crypter", "cryptage", "encoder"
  ],

  logiciel: [
    "logiciel", "programme",
    "application", "appli"
  ],

  malveillant: [
    "malveillant", "malware",
    "virus", "nuisible"
  ],

  frauduleux: [
    "frauduleux", "fraude",
    "arnaque", "escroquerie"
  ],

  phishing: [
    "phishing", "hameconnage"
  ],

  authentification: [
    "authentification", "verification",
    "identification"
  ],

  reseau: [
    "reseau", "network"
  ]
};

const dictionnaire = new Map();

for (const [motPrincipal, variantes] of Object.entries(synonymes)) {
  for (const variante of variantes) {
    dictionnaire.set(variante, motPrincipal);
  }
}

// Distance entre deux mots : tolérance aux petites fautes
function distanceLevenshtein(a, b) {
  const precedent = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    let diagonal = precedent[0];
    precedent[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const ancien = precedent[j];

      precedent[j] = Math.min(
        precedent[j] + 1,
        precedent[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );

      diagonal = ancien;
    }
  }

  return precedent[b.length];
}

function simplifierMot(mot) {
  if (dictionnaire.has(mot)) {
    return dictionnaire.get(mot);
  }

  // Petites fautes sur les synonymes connus
  if (mot.length >= 5) {
    for (const [variante, principal] of dictionnaire) {
      if (
        Math.abs(mot.length - variante.length) <= 1 &&
        distanceLevenshtein(mot, variante) <= 1
      ) {
        return principal;
      }
    }
  }

  return mot;
}

function extraireMots(texte) {
  const propre = normaliser(texte)
    .replace(/\bmots?\s+de\s+passe\b/g, " motdepasse ")
    .replace(/\bpasswords?\b/g, " motdepasse ");

  return propre
    .split(" ")
    .filter((mot) => mot && !motsInutiles.has(mot))
    .map(simplifierMot);
}

function comparerPhrases(reponse, attendue) {
  const motsReponse = [...new Set(extraireMots(reponse))];
  const motsAttendus = [...new Set(extraireMots(attendue))];

  if (!motsReponse.length || !motsAttendus.length) {
    return false;
  }

  // Ne pas accepter une réponse qui inverse le sens
  const negations = /\b(ne|pas|jamais|aucun|sans|impossible)\b/;

  const negatifReponse = negations.test(normaliser(reponse));
  const negatifAttendu = negations.test(normaliser(attendue));

  if (negatifReponse !== negatifAttendu) {
    return false;
  }

  const communs = motsAttendus.filter(
    (mot) => motsReponse.includes(mot)
  ).length;

  const precision = communs / motsReponse.length;
  const couverture = communs / motsAttendus.length;

  // Il faut retrouver la majorité des idées importantes
  return (
    couverture >= 0.75 &&
    precision >= 0.6 &&
    communs >= 2
  );
}

function verifierTexte(reponse, bonnesReponses) {
  const saisie = normaliser(reponse);

  if (!saisie || saisie.length > 1000) {
    return false;
  }

  return bonnesReponses.some((bonne) => {
    const attendue = normaliser(bonne);

    // Réponse exacte
    if (saisie === attendue) {
      return true;
    }

    // Réponses courtes : acronymes, noms techniques
    const motsAttendus = extraireMots(bonne);

    if (motsAttendus.length <= 2) {
      const motsSaisis = extraireMots(reponse);

      if (
        motsSaisis.length === motsAttendus.length &&
        motsAttendus.every(
          (mot) => motsSaisis.includes(mot)
        )
      ) {
        return true;
      }

      // Une petite faute pour les termes assez longs
      if (
        saisie.length >= 6 &&
        Math.abs(saisie.length - attendue.length) <= 1 &&
        distanceLevenshtein(saisie, attendue) <= 1
      ) {
        return true;
      }

      return false;
    }

    // Réponses longues : comparaison des idées
    return comparerPhrases(reponse, bonne);
  });
}

// =====================================
// AUTHENTIFICATION
// =====================================

function creerToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id },
    SECRET,
    { expiresIn: "7d" }
  );
}

function authentifier(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Connexion nécessaire."
    });
  }

  try {
    const donnees = jwt.verify(token, SECRET);
    req.utilisateurId = donnees.id;
    next();
  } catch {
    res.status(401).json({
      message: "Session expirée. Reconnecte-toi."
    });
  }
}

// =====================================
// INSCRIPTION
// =====================================

app.post("/api/inscription", async (req, res) => {
  try {
    const { pseudo, email, motDePasse } = req.body;

    if (
      typeof pseudo !== "string" ||
      typeof email !== "string" ||
      typeof motDePasse !== "string" ||
      pseudo.trim().length < 2 ||
      pseudo.trim().length > 50 ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      motDePasse.length < 12 ||
      motDePasse.length > 72
    ) {
      return res.status(400).json({
        message:
          "Pseudo de 2 à 50 caractères, e-mail valide et mot de passe de 12 à 72 caractères requis."
      });
    }

    const emailNormalise = email.trim().toLowerCase();

    const [existants] = await db.query(
      "SELECT id FROM utilisateurs WHERE email = ?",
      [emailNormalise]
    );

    if (existants.length) {
      return res.status(409).json({
        message: "Cette adresse e-mail est déjà utilisée."
      });
    }

    const hash = await bcrypt.hash(motDePasse, 12);

    const [resultat] = await db.query(
      `INSERT INTO utilisateurs
       (pseudo, email, mot_de_passe)
       VALUES (?, ?, ?)`,
      [pseudo.trim(), emailNormalise, hash]
    );

    const utilisateur = {
      id: resultat.insertId,
      pseudo: pseudo.trim(),
      email: emailNormalise
    };

    res.status(201).json({
      utilisateur,
      token: creerToken(utilisateur)
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Cette adresse e-mail est déjà utilisée."
      });
    }

    console.error(error);

    res.status(500).json({
      message: "Erreur pendant l'inscription."
    });
  }
});

// =====================================
// CONNEXION
// =====================================

app.post("/api/connexion", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (
      typeof email !== "string" ||
      typeof motDePasse !== "string"
    ) {
      return res.status(400).json({
        message: "Identifiants invalides."
      });
    }

    const [utilisateurs] = await db.query(
      `SELECT id, pseudo, email, mot_de_passe
       FROM utilisateurs
       WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    const utilisateur = utilisateurs[0];

    if (
      !utilisateur ||
      !(await bcrypt.compare(
        motDePasse,
        utilisateur.mot_de_passe
      ))
    ) {
      return res.status(401).json({
        message: "E-mail ou mot de passe incorrect."
      });
    }

    res.json({
      token: creerToken(utilisateur),
      utilisateur: {
        id: utilisateur.id,
        pseudo: utilisateur.pseudo,
        email: utilisateur.email
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur pendant la connexion."
    });
  }
});

// =====================================
// PROFIL
// =====================================

app.get("/api/moi", authentifier, async (req, res) => {
  try {
    const [utilisateurs] = await db.query(
      `SELECT id, pseudo, email
       FROM utilisateurs WHERE id = ?`,
      [req.utilisateurId]
    );

    if (!utilisateurs.length) {
      return res.status(401).json({
        message: "Compte introuvable."
      });
    }

    res.json({ utilisateur: utilisateurs[0] });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur du serveur."
    });
  }
});

// =====================================
// PROGRESSION
// =====================================

app.get("/api/progression", authentifier, async (req, res) => {
  try {
    const [lignes] = await db.query(
      `SELECT q.niveau, COUNT(*) AS vues
       FROM questions_vues qv
       JOIN questions q ON q.id = qv.question_id
       WHERE qv.utilisateur_id = ?
       GROUP BY q.niveau`,
      [req.utilisateurId]
    );

    const [totaux] = await db.query(
      `SELECT niveau, COUNT(*) AS total
       FROM questions
       GROUP BY niveau`
    );

    const progression = niveaux.map((niveau) => ({
      niveau,
      vues: Number(
        lignes.find((l) => l.niveau === niveau)?.vues || 0
      ),
      total: Number(
        totaux.find((l) => l.niveau === niveau)?.total || 0
      )
    }));

    res.json(progression);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur du serveur."
    });
  }
});

// =====================================
// QUESTIONS JAMAIS VUES
// =====================================

app.get("/api/questions/:niveau", authentifier, async (req, res) => {
  const { niveau } = req.params;

  if (!niveaux.includes(niveau)) {
    return res.status(400).json({
      message: "Niveau invalide."
    });
  }

  let connexion;

  try {
    connexion = await db.getConnection();
    await connexion.beginTransaction();

    const [utilisateurs] = await connexion.query(
      `SELECT id FROM utilisateurs
       WHERE id = ? FOR UPDATE`,
      [req.utilisateurId]
    );

    if (!utilisateurs.length) {
      await connexion.rollback();

      return res.status(401).json({
        message: "Compte introuvable."
      });
    }

    const [questions] = await connexion.query(
      `SELECT q.id, q.niveau, q.type, q.titre
       FROM questions q
       WHERE q.niveau = ?
       AND NOT EXISTS (
         SELECT 1 FROM questions_vues qv
         WHERE qv.question_id = q.id
         AND qv.utilisateur_id = ?
       )
       ORDER BY RAND()
       LIMIT 10`,
      [niveau, req.utilisateurId]
    );

    for (const question of questions) {
      await connexion.query(
        `INSERT INTO questions_vues
         (utilisateur_id, question_id)
         VALUES (?, ?)`,
        [req.utilisateurId, question.id]
      );
    }

    let reponses = [];

    if (questions.length) {
      const ids = questions.map((q) => q.id);
      const placeholders = ids.map(() => "?").join(",");

      const [lignes] = await connexion.query(
        `SELECT id, question_id, texte
         FROM reponses
         WHERE question_id IN (${placeholders})`,
        ids
      );

      reponses = lignes;
    }

    await connexion.commit();

    const resultat = questions.map((question) => ({
      ...question,
      reponses: reponses
        .filter((r) => r.question_id === question.id)
        .map((r) => ({
          id: r.id,
          texte: r.texte
        }))
        .sort(() => Math.random() - 0.5)
    }));

    res.json(resultat);
  } catch (error) {
    if (connexion) await connexion.rollback();

    console.error(error);

    res.status(500).json({
      message: "Impossible de récupérer les questions."
    });
  } finally {
    if (connexion) connexion.release();
  }
});

// =====================================
// VÉRIFICATION DES RÉPONSES
// =====================================

app.post("/api/verifier", authentifier, async (req, res) => {
  try {
    const { questionId, reponses: choix } = req.body;

    if (
      !Number.isInteger(questionId) ||
      !Array.isArray(choix) ||
      choix.length > 20
    ) {
      return res.status(400).json({
        message: "Réponse invalide."
      });
    }

    const [questions] = await db.query(
      `SELECT q.id, q.type
       FROM questions q
       JOIN questions_vues qv
       ON qv.question_id = q.id
       WHERE q.id = ?
       AND qv.utilisateur_id = ?`,
      [questionId, req.utilisateurId]
    );

    if (!questions.length) {
      return res.status(404).json({
        message: "Question indisponible."
      });
    }

    const [reponses] = await db.query(
      `SELECT id, texte, est_correct
       FROM reponses
       WHERE question_id = ?`,
      [questionId]
    );

    const bonnes = reponses.filter(
      (r) => Number(r.est_correct) === 1
    );

    let correct = false;

    if (questions[0].type === "texte") {
      if (
        choix.length !== 1 ||
        typeof choix[0] !== "string" ||
        choix[0].length > 1000
      ) {
        return res.status(400).json({
          message: "Réponse écrite invalide."
        });
      }

      // Vérification gratuite et plus souple
      correct = verifierTexte(
        choix[0],
        bonnes.map((r) => r.texte)
      );
    } else {
      const idsChoisis = choix.map(Number);
      const idsCorrects = bonnes.map((r) => r.id);
      const idsValides = reponses.map((r) => r.id);

      correct =
        idsChoisis.every(
          (id) =>
            Number.isInteger(id) &&
            idsValides.includes(id)
        ) &&
        idsChoisis.length === idsCorrects.length &&
        new Set(idsChoisis).size === idsChoisis.length &&
        idsChoisis.every(
          (id) => idsCorrects.includes(id)
        );
    }

    res.json({
      correct,
      bonnesReponses: bonnes.map((r) => r.texte)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Impossible de vérifier la réponse."
    });
  }
});

// =====================================
// DÉMARRAGE
// =====================================

app.listen(PORT, () => {
  console.log(
    `CyberQuiz démarré sur http://localhost:${PORT}`
  );
});
