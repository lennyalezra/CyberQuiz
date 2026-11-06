
import { useEffect, useState } from "react";
import {
  Shield, Code2, Sprout, Zap, Flame, Trophy,
  Star, LockKeyhole, ArrowRight, ArrowLeft,
  RotateCcw, CheckCircle2, XCircle, Circle,
  Square, CheckSquare, BookOpen, Home, LogOut
} from "lucide-react";

import "./App.css";

const API = "http://localhost:3001";

function App() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [sessionChargee, setSessionChargee] = useState(false);
  const [modeInscription, setModeInscription] = useState(false);

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [theme, setTheme] = useState("");
  const [niveau, setNiveau] = useState("");
  const [questions, setQuestions] = useState([]);
  const [numero, setNumero] = useState(0);
  const [choix, setChoix] = useState([]);
  const [texte, setTexte] = useState("");
  const [valide, setValide] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [bonnesReponses, setBonnesReponses] = useState([]);
  const [score, setScore] = useState(0);
  const [termine, setTermine] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [verification, setVerification] = useState(false);
  const [erreur, setErreur] = useState("");

  const question = questions[numero];

  async function requete(chemin, options = {}) {
    const token = localStorage.getItem("cyberquiz_token");

    const reponse = await fetch(`${API}${chemin}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const donnees = await reponse.json();

    if (!reponse.ok) {
      if (reponse.status === 401 && chemin !== "/api/login") {
        localStorage.removeItem("cyberquiz_token");
        setUtilisateur(null);
      }

      throw new Error(donnees.message || "Une erreur est survenue.");
    }

    return donnees;
  }

  useEffect(() => {
    async function restaurerSession() {
      const token = localStorage.getItem("cyberquiz_token");

      if (token) {
        try {
          const reponse = await fetch(`${API}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!reponse.ok) throw new Error("Session invalide");

          const donnees = await reponse.json();
          setUtilisateur(donnees.utilisateur);
        } catch {
          localStorage.removeItem("cyberquiz_token");
        }
      }

      setSessionChargee(true);
    }

    restaurerSession();
  }, []);

  async function envoyerCompte(event) {
    event.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const chemin = modeInscription
        ? "/api/register"
        : "/api/login";

      const donnees = await requete(chemin, {
        method: "POST",
        body: JSON.stringify({
          pseudo,
          email,
          password,
        }),
      });

      localStorage.setItem("cyberquiz_token", donnees.token);
      setUtilisateur(donnees.utilisateur);
      setPassword("");
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  function reinitialiserQuiz() {
    setQuestions([]);
    setNumero(0);
    setChoix([]);
    setTexte("");
    setValide(false);
    setCorrect(false);
    setBonnesReponses([]);
    setScore(0);
    setTermine(false);
    setErreur("");
  }

  function deconnexion() {
    localStorage.removeItem("cyberquiz_token");
    setUtilisateur(null);
    setTheme("");
    setNiveau("");
    setEmail("");
    setPassword("");
    reinitialiserQuiz();
  }

  function choisirTheme(valeur) {
    reinitialiserQuiz();
    setTheme(valeur);
    setNiveau("");
  }

  async function choisirNiveau(valeur) {
    reinitialiserQuiz();
    setNiveau(valeur);

    if (!valeur) return;

    setChargement(true);

    try {
      const donnees = await requete(
        `/api/questions?theme=${encodeURIComponent(theme)}&niveau=${encodeURIComponent(valeur)}`
      );

      setQuestions(donnees);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  function retourAccueil() {
    reinitialiserQuiz();
    setTheme("");
    setNiveau("");
  }

  function choisirReponse(reponse) {
    if (valide || verification) return;

    if (question.type === "multiple") {
      setChoix((ancien) =>
        ancien.includes(reponse)
          ? ancien.filter((r) => r !== reponse)
          : [...ancien, reponse]
      );
    } else {
      setChoix([reponse]);
    }
  }

  async function verifier() {
    if (!question || valide || verification) return;

    const reponse =
      question.type === "texte"
        ? texte.trim()
        : question.type === "multiple"
        ? choix
        : choix[0];

    if (!reponse || (Array.isArray(reponse) && !reponse.length)) {
      return;
    }

    setVerification(true);
    setErreur("");

    try {
      const resultat = await requete("/api/verifier", {
        method: "POST",
        body: JSON.stringify({
          questionId: question.id,
          reponse,
        }),
      });

      setCorrect(resultat.correct);
      setBonnesReponses(resultat.bonnesReponses || []);
      setValide(true);

      if (resultat.correct) {
        setScore((ancien) => ancien + 1);
      }
    } catch (e) {
      setErreur(e.message);
    } finally {
      setVerification(false);
    }
  }

  function suivante() {
    if (numero === questions.length - 1) {
      setTermine(true);
    } else {
      setNumero((ancien) => ancien + 1);
      setChoix([]);
      setTexte("");
      setValide(false);
      setCorrect(false);
      setBonnesReponses([]);
      setErreur("");
    }
  }

  if (!sessionChargee) {
    return (
      <main className="page">
        <div className="quiz-card">
          <section className="accueil">
            <h1>Chargement de CyberQuiz...</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="quiz-card">
        <header className="entete">
          <div className="logo">
            <LockKeyhole size={25} strokeWidth={1.8} />
            <span>CyberQuiz</span>
          </div>

          {utilisateur ? (
            <button
              className="retour-accueil"
              onClick={deconnexion}
            >
              <LogOut size={17} />
              Déconnexion
            </button>
          ) : (
            <span className="tag">QUIZ INFORMATIQUE</span>
          )}
        </header>

        {/* CONNEXION ET INSCRIPTION */}
        {!utilisateur && (
          <section className="accueil">
            <div className="hero-icon">
              <LockKeyhole size={55} strokeWidth={1.5} />
            </div>

            <p className="surtitre">
              BIENVENUE SUR CYBERQUIZ
            </p>

            <h1>
              {modeInscription
                ? "Créer mon compte"
                : "Se connecter"}
            </h1>

            <p className="description">
              Retrouve tes quiz et découvre de nouvelles
              questions à chaque partie.
            </p>

            <form
              onSubmit={envoyerCompte}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 15,
                maxWidth: 400,
                margin: "25px auto",
                width: "100%",
              }}
            >
              {modeInscription && (
                <input
                  className="champ"
                  placeholder="Ton pseudo"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                />
              )}

              <input
                className="champ"
                type="email"
                placeholder="Ton adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                className="champ"
                type="password"
                placeholder="Ton mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={modeInscription ? 8 : undefined}
                required
              />

              {erreur && (
                <p className="description">{erreur}</p>
              )}

              <button
                className="principal"
                type="submit"
                disabled={chargement}
              >
                {chargement
                  ? "Chargement..."
                  : modeInscription
                  ? "Créer mon compte"
                  : "Se connecter"}
                <ArrowRight size={17} />
              </button>
            </form>

            <button
              className="retour-accueil"
              onClick={() => {
                setModeInscription(!modeInscription);
                setErreur("");
              }}
            >
              {modeInscription
                ? "Déjà un compte ? Se connecter"
                : "Pas de compte ? S'inscrire"}
            </button>
          </section>
        )}

        {/* ACCUEIL */}
        {utilisateur && !theme && (
          <section className="accueil">
            <div className="hero-icon">
              <BookOpen size={55} strokeWidth={1.5} />
            </div>

            <p className="surtitre">
              BONJOUR {utilisateur.pseudo.toUpperCase()}
            </p>

            <h1>
              Prête à tester tes <span>connaissances ?</span>
            </h1>

            <p className="description">
              1 800 questions, 2 thèmes et 3 niveaux.
              Chaque partie contient 10 questions !
            </p>

            <h2>Choisis ton thème</h2>

            <div className="themes">
              <button
                className="theme-card"
                onClick={() => choisirTheme("Cyber")}
              >
                <span className="theme-emoji">
                  <Shield size={45} strokeWidth={1.5} />
                </span>
                <strong>Cybersécurité</strong>
                <small>Réseaux, protection et sécurité</small>
                <span className="theme-fleche">
                  Commencer <ArrowRight size={16} />
                </span>
              </button>

              <button
                className="theme-card"
                onClick={() => choisirTheme("Fullstack")}
              >
                <span className="theme-emoji">
                  <Code2 size={45} strokeWidth={1.5} />
                </span>
                <strong>Fullstack</strong>
                <small>HTML, CSS, React, Node.js et SQL</small>
                <span className="theme-fleche">
                  Commencer <ArrowRight size={16} />
                </span>
              </button>
            </div>
          </section>
        )}

        {/* NIVEAUX */}
        {utilisateur && theme && !niveau && (
          <section className="accueil">
            <div className="hero-icon">
              {theme === "Cyber" ? (
                <Shield size={55} strokeWidth={1.5} />
              ) : (
                <Code2 size={55} strokeWidth={1.5} />
              )}
            </div>

            <p className="surtitre">THÈME SÉLECTIONNÉ</p>

            <h1>
              {theme === "Cyber"
                ? "Cybersécurité"
                : "Fullstack"}
            </h1>

            <p className="description">
              Choisis ton niveau de difficulté.
            </p>

            <h2>Choisis ta difficulté</h2>

            <div className="niveaux">
              {[
                {
                  nom: "Facile",
                  description: "Les bases",
                  Icone: Sprout,
                },
                {
                  nom: "Moyen",
                  description: "Pour progresser",
                  Icone: Zap,
                },
                {
                  nom: "Difficile",
                  description: "Les notions avancées",
                  Icone: Flame,
                },
              ].map(({ nom, description, Icone }) => (
                <button
                  key={nom}
                  className="niveau"
                  onClick={() => choisirNiveau(nom)}
                >
                  <span className="emoji">
                    <Icone size={27} strokeWidth={1.6} />
                  </span>
                  <strong>{nom}</strong>
                  <small>{description}</small>
                  <ArrowRight className="fleche" size={19} />
                </button>
              ))}
            </div>

            <button
              className="retour-accueil"
              onClick={retourAccueil}
            >
              <ArrowLeft size={17} />
              Changer de thème
            </button>
          </section>
        )}

        {/* CHARGEMENT */}
        {utilisateur && theme && niveau && chargement && (
          <section className="accueil">
            <h1>Chargement des questions...</h1>
          </section>
        )}

        {/* AUCUNE QUESTION / ERREUR */}
        {utilisateur &&
          theme &&
          niveau &&
          !chargement &&
          !termine &&
          !question && (
            <section className="accueil">
              <div className="hero-icon">
                <Trophy size={55} />
              </div>

              <h1>
                {erreur
                  ? "Une erreur est survenue"
                  : "Toutes les questions ont été vues !"}
              </h1>

              <p className="description">
                {erreur ||
                  "Tu as terminé les questions disponibles pour ce niveau."}
              </p>

              <button
                className="principal"
                onClick={() => choisirNiveau(niveau)}
              >
                <RotateCcw size={18} />
                Réessayer
              </button>

              <button
                className="retour-accueil"
                onClick={retourAccueil}
              >
                <Home size={17} />
                Accueil
              </button>
            </section>
          )}

        {/* JEU */}
        {utilisateur &&
          theme &&
          niveau &&
          !chargement &&
          !termine &&
          question && (
            <section className="jeu">
              <div className="infos">
                <span className="pastille">
                  {theme} • {niveau}
                </span>

                <span>
                  Question {numero + 1} / {questions.length}
                </span>

                <span className="score-icon">
                  <Star size={17} strokeWidth={1.8} />
                  {score}
                </span>
              </div>

              <div className="progression">
                <div
                  style={{
                    width: `${
                      ((numero + 1) / questions.length) * 100
                    }%`,
                  }}
                />
              </div>

              <p className="surtitre">
                {question.type === "qcm"
                  ? "UNE SEULE RÉPONSE"
                  : question.type === "vraiFaux"
                  ? "VRAI OU FAUX"
                  : question.type === "texte"
                  ? "RÉPONSE À ÉCRIRE"
                  : "PLUSIEURS RÉPONSES POSSIBLES"}
              </p>

              <h1 className="titre-question">
                {question.titre}
              </h1>

              {question.type === "texte" ? (
                <input
                  className="champ"
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  disabled={valide || verification}
                  placeholder="Écris ta réponse..."
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      texte.trim() &&
                      !valide &&
                      !verification
                    ) {
                      verifier();
                    }
                  }}
                />
              ) : (
                <div className="propositions">
                  {(question.type === "vraiFaux"
                    ? ["Vrai", "Faux"]
                    : question.reponses || []
                  ).map((reponse, index) => (
                    <button
                      key={`${index}-${reponse}`}
                      disabled={valide || verification}
                      className={`proposition ${
                        choix.includes(reponse)
                          ? "selectionnee"
                          : ""
                      }`}
                      onClick={() => choisirReponse(reponse)}
                    >
                      <span className="indicateur">
                        {question.type === "multiple" ? (
                          choix.includes(reponse) ? (
                            <CheckSquare
                              size={21}
                              strokeWidth={1.7}
                            />
                          ) : (
                            <Square
                              size={21}
                              strokeWidth={1.7}
                            />
                          )
                        ) : (
                          <Circle
                            size={21}
                            strokeWidth={1.7}
                            fill={
                              choix.includes(reponse)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        )}
                      </span>

                      {reponse}
                    </button>
                  ))}
                </div>
              )}

              {valide && (
                <div
                  className={`retour ${
                    correct ? "succes" : "erreur"
                  }`}
                >
                  <strong className="feedback-title">
                    {correct ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <XCircle size={20} />
                    )}

                    {correct
                      ? "Bonne réponse !"
                      : "Mauvaise réponse"}
                  </strong>

                  {!correct && (
                    <p>
                      Réponse attendue :{" "}
                      {bonnesReponses.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {erreur && (
                <p className="description">{erreur}</p>
              )}

              <div className="actions">
                <button
                  className="retour-accueil"
                  onClick={retourAccueil}
                >
                  <Home size={17} />
                  Accueil
                </button>

                {!valide ? (
                  <button
                    className="principal"
                    disabled={
                      verification ||
                      (question.type === "texte"
                        ? !texte.trim()
                        : choix.length === 0)
                    }
                    onClick={verifier}
                  >
                    {verification
                      ? "Vérification..."
                      : "Valider ma réponse"}

                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="principal"
                    onClick={suivante}
                  >
                    {numero === questions.length - 1
                      ? "Voir mon résultat"
                      : "Question suivante"}

                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
            </section>
          )}

        {/* RÉSULTATS */}
        {utilisateur && termine && (
          <section className="resultat">
            <div className="hero-icon">
              <Trophy size={58} strokeWidth={1.5} />
            </div>

            <p className="surtitre">
              {theme.toUpperCase()} • {niveau.toUpperCase()}
            </p>

            <h1>Quiz terminé !</h1>

            <p className="description">
              Tu as terminé les {questions.length} questions.
              Voici ton résultat !
            </p>

            <div className="score-final">
              <strong>
                {score}
                <span> / {questions.length}</span>
              </strong>

              <p>
                {Math.round(
                  (score / questions.length) * 100
                )}
                % de bonnes réponses
              </p>
            </div>

            <p className="encouragement">
              {score === questions.length
                ? "Excellent, un sans-faute !"
                : score >= 7
                ? "Très bon résultat !"
                : score >= 4
                ? "Bon début, tu progresses !"
                : "Continue à t'entraîner !"}
            </p>

            <div className="actions-resultat">
              <button
                className="principal"
                onClick={() => choisirNiveau(niveau)}
              >
                <RotateCcw size={18} />
                Rejouer
              </button>

              <button
                className="secondaire"
                onClick={() => choisirNiveau("")}
              >
                Changer de niveau
              </button>

              <button
                className="secondaire"
                onClick={retourAccueil}
              >
                <Home size={17} />
                Changer de thème
              </button>
            </div>
          </section>
        )}

        <footer>
          CyberQuiz • Apprendre l'informatique en s'amusant
        </footer>
      </div>
    </main>
  );
}

export default App;
