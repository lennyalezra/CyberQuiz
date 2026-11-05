
import { useState } from 'react';
import './App.css';

const questions = [
  // FACILE
  { niveau: 'Facile', type: 'qcm', titre: 'Que signifie HTTPS ?', reponses: ['HyperText Transfer Protocol Secure', 'HyperText Transfer Privacy System', 'High Technology Transfer Protocol', 'HyperText Transmission Protection Service'], bonneReponse: 'HyperText Transfer Protocol Secure' },
  { niveau: 'Facile', type: 'vraiFaux', titre: 'Un mot de passe long est généralement plus difficile à deviner.', bonneReponse: 'Vrai' },
  { niveau: 'Facile', type: 'texte', titre: 'Comment appelle-t-on une tentative de vol d’informations par un faux message ?', bonneReponse: ['phishing', 'hameçonnage'] },
  { niveau: 'Facile', type: 'qcm', titre: 'Quel outil peut détecter des logiciels malveillants ?', reponses: ['Un antivirus', 'Un navigateur', 'Un éditeur de texte', 'Une calculatrice'], bonneReponse: 'Un antivirus' },
  { niveau: 'Facile', type: 'multiple', titre: 'Quelles habitudes protègent tes comptes ?', reponses: ['Utiliser des mots de passe différents', 'Activer la double authentification', 'Partager ses codes', 'Installer les mises à jour'], bonnesReponses: ['Utiliser des mots de passe différents', 'Activer la double authentification', 'Installer les mises à jour'] },
  { niveau: 'Facile', type: 'vraiFaux', titre: 'Un réseau Wi-Fi public est toujours sécurisé.', bonneReponse: 'Faux' },
  { niveau: 'Facile', type: 'qcm', titre: 'Que faut-il faire face à un lien suspect ?', reponses: ['Cliquer pour vérifier', 'Le partager', 'Éviter de cliquer', 'Donner son mot de passe'], bonneReponse: 'Éviter de cliquer' },
  { niveau: 'Facile', type: 'texte', titre: 'Quel mot anglais désigne un logiciel malveillant ?', bonneReponse: ['malware'] },
  { niveau: 'Facile', type: 'multiple', titre: 'Quelles informations vaut-il mieux ne pas publier ?', reponses: ['Son mot de passe', 'Son adresse personnelle', 'Sa couleur préférée', 'Ses codes de connexion'], bonnesReponses: ['Son mot de passe', 'Son adresse personnelle', 'Ses codes de connexion'] },
  { niveau: 'Facile', type: 'qcm', titre: 'À quoi sert une sauvegarde ?', reponses: ['À conserver une copie de ses fichiers', 'À accélérer Internet', 'À modifier son écran', 'À bloquer tous les messages'], bonneReponse: 'À conserver une copie de ses fichiers' },

  // MOYEN
  { niveau: 'Moyen', type: 'qcm', titre: 'Quel est le rôle principal d’un pare-feu ?', reponses: ['Filtrer le trafic réseau', 'Recharger la batterie', 'Créer des mots de passe', 'Supprimer les cookies'], bonneReponse: 'Filtrer le trafic réseau' },
  { niveau: 'Moyen', type: 'vraiFaux', titre: 'La double authentification peut ajouter une protection même si un mot de passe est découvert.', bonneReponse: 'Vrai' },
  { niveau: 'Moyen', type: 'texte', titre: 'Quel sigle de trois lettres désigne un réseau privé virtuel ?', bonneReponse: ['vpn'] },
  { niveau: 'Moyen', type: 'multiple', titre: 'Quels signes peuvent indiquer un e-mail frauduleux ?', reponses: ['Une demande urgente de mot de passe', 'Une adresse d’expéditeur étrange', 'Un lien vers un site imitant un service connu', 'Une formule de politesse'], bonnesReponses: ['Une demande urgente de mot de passe', 'Une adresse d’expéditeur étrange', 'Un lien vers un site imitant un service connu'] },
  { niveau: 'Moyen', type: 'qcm', titre: 'Pourquoi installer les mises à jour de sécurité ?', reponses: ['Pour corriger des failles', 'Pour supprimer le clavier', 'Pour changer la langue', 'Pour effacer Internet'], bonneReponse: 'Pour corriger des failles' },
  { niveau: 'Moyen', type: 'vraiFaux', titre: 'Le mode navigation privée rend anonyme sur Internet.', bonneReponse: 'Faux' },
  { niveau: 'Moyen', type: 'qcm', titre: 'Qu’est-ce qu’un ransomware ?', reponses: ['Un logiciel qui bloque des données et réclame une rançon', 'Un outil de dessin', 'Un navigateur sécurisé', 'Un système de sauvegarde'], bonneReponse: 'Un logiciel qui bloque des données et réclame une rançon' },
  { niveau: 'Moyen', type: 'texte', titre: 'Quel sigle désigne l’authentification multifacteur ?', bonneReponse: ['mfa'] },
  { niveau: 'Moyen', type: 'multiple', titre: 'Quelles actions aident à sécuriser un ordinateur ?', reponses: ['Verrouiller sa session', 'Installer les correctifs', 'Désactiver toute protection', 'Télécharger depuis des sources fiables'], bonnesReponses: ['Verrouiller sa session', 'Installer les correctifs', 'Télécharger depuis des sources fiables'] },
  { niveau: 'Moyen', type: 'qcm', titre: 'Que signifie le cadenas HTTPS dans un navigateur ?', reponses: ['La connexion est chiffrée, sans garantir la fiabilité du site', 'Le site ne peut pas être frauduleux', 'Le site est gratuit', 'Le site ne conserve aucune donnée'], bonneReponse: 'La connexion est chiffrée, sans garantir la fiabilité du site' },

  // DIFFICILE
  { niveau: 'Difficile', type: 'qcm', titre: 'Quelle attaque vise à perturber un service en le submergeant de trafic ?', reponses: ['DDoS', 'Phishing', 'Compression', 'Sauvegarde'], bonneReponse: 'DDoS' },
  { niveau: 'Difficile', type: 'vraiFaux', titre: 'Une fonction de hachage cryptographique est conçue pour être facilement inversée.', bonneReponse: 'Faux' },
  { niveau: 'Difficile', type: 'texte', titre: 'Quel sigle désigne le langage de requêtes utilisé avec de nombreuses bases relationnelles ?', bonneReponse: ['sql'] },
  { niveau: 'Difficile', type: 'multiple', titre: 'Quelles mesures aident à prévenir les injections SQL ?', reponses: ['Utiliser des requêtes paramétrées', 'Limiter les droits du compte de base de données', 'Assembler les requêtes avec du texte non vérifié', 'Valider les entrées côté serveur'], bonnesReponses: ['Utiliser des requêtes paramétrées', 'Limiter les droits du compte de base de données', 'Valider les entrées côté serveur'] },
  { niveau: 'Difficile', type: 'qcm', titre: 'Quel protocole sécurise généralement les connexions HTTPS ?', reponses: ['TLS', 'FTP', 'HTTP seul', 'SMTP'], bonneReponse: 'TLS' },
  { niveau: 'Difficile', type: 'vraiFaux', titre: 'En chiffrement symétrique, la même clé secrète sert au chiffrement et au déchiffrement.', bonneReponse: 'Vrai' },
  { niveau: 'Difficile', type: 'qcm', titre: 'À quoi sert principalement le salage des mots de passe avant hachage ?', reponses: ['À rendre les hachages identiques', 'À compliquer les attaques par tables précalculées', 'À transmettre les mots de passe en clair', 'À supprimer le besoin de mot de passe'], bonneReponse: 'À compliquer les attaques par tables précalculées' },
  { niveau: 'Difficile', type: 'texte', titre: 'Quel sigle désigne une faille permettant d’injecter des scripts dans une page web ?', bonneReponse: ['xss'] },
  { niveau: 'Difficile', type: 'multiple', titre: 'Quelles pratiques aident à sécuriser une API ?', reponses: ['Contrôler les autorisations', 'Valider les données reçues', 'Afficher les secrets dans les réponses', 'Limiter les requêtes abusives'], bonnesReponses: ['Contrôler les autorisations', 'Valider les données reçues', 'Limiter les requêtes abusives'] },
  { niveau: 'Difficile', type: 'qcm', titre: 'Quel principe consiste à donner seulement les accès nécessaires ?', reponses: ['Le moindre privilège', 'La confiance totale', 'La duplication libre', 'L’accès universel'], bonneReponse: 'Le moindre privilège' }
];

function App() {
  const [niveau, setNiveau] = useState('');
  const [numero, setNumero] = useState(0);
  const [choix, setChoix] = useState([]);
  const [texte, setTexte] = useState('');
  const [valide, setValide] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [termine, setTermine] = useState(false);

  const liste = questions.filter((question) => question.niveau === niveau);
  const question = liste[numero];

  function choisirNiveau(nouveauNiveau) {
    setNiveau(nouveauNiveau);
    setNumero(0);
    setChoix([]);
    setTexte('');
    setValide(false);
    setCorrect(false);
    setScore(0);
    setTermine(false);
  }

  function choisirReponse(reponse) {
    if (valide) return;

    if (question.type === 'multiple') {
      setChoix(
        choix.includes(reponse)
          ? choix.filter((item) => item !== reponse)
          : [...choix, reponse]
      );
    } else {
      setChoix([reponse]);
    }
  }

  function verifier() {
    if (valide) return;

    let estCorrect = false;

    if (question.type === 'texte') {
      estCorrect = question.bonneReponse.includes(
        texte.trim().toLowerCase()
      );
    } else if (question.type === 'multiple') {
      estCorrect =
        choix.length === question.bonnesReponses.length &&
        choix.every((item) => question.bonnesReponses.includes(item));
    } else {
      estCorrect = choix[0] === question.bonneReponse;
    }

    setCorrect(estCorrect);

    if (estCorrect) {
      setScore(score + 1);
    }

    setValide(true);
  }

  function suivante() {
    if (numero === liste.length - 1) {
      setTermine(true);
    } else {
      setNumero(numero + 1);
      setChoix([]);
      setTexte('');
      setValide(false);
      setCorrect(false);
    }
  }

  function bonneReponseTexte() {
    if (question.type === 'multiple') {
      return question.bonnesReponses.join(', ');
    }

    if (question.type === 'texte') {
      return question.bonneReponse[0];
    }

    return question.bonneReponse;
  }

  return (
    <main className="page">
      <div className="quiz-card">

        <header className="entete">
          <div className="logo">
            🔐 <span>CyberQuiz</span>
          </div>
          <span className="tag">CYBERSÉCURITÉ</span>
        </header>

        {!niveau && (
          <section className="accueil">
            <div className="hero-icon">🛡️</div>

            <p className="surtitre">PRÊTE À RELEVER LE DÉFI ?</p>

            <h1>
              Teste tes réflexes <span>cyber.</span>
            </h1>

            <p className="description">
              30 questions réparties en 3 niveaux.
              QCM, vrai ou faux, réponses à écrire et choix multiples :
              à toi de jouer !
            </p>

            <h2>Choisis ton niveau</h2>

            <div className="niveaux">
              <button
                className="niveau"
                onClick={() => choisirNiveau('Facile')}
              >
                <span className="emoji">🌱</span>
                <strong>Facile</strong>
                <small>Les bases</small>
                <span className="fleche">→</span>
              </button>

              <button
                className="niveau"
                onClick={() => choisirNiveau('Moyen')}
              >
                <span className="emoji">⚡</span>
                <strong>Moyen</strong>
                <small>Les bons réflexes</small>
                <span className="fleche">→</span>
              </button>

              <button
                className="niveau"
                onClick={() => choisirNiveau('Difficile')}
              >
                <span className="emoji">🔥</span>
                <strong>Difficile</strong>
                <small>Les notions techniques</small>
                <span className="fleche">→</span>
              </button>
            </div>
          </section>
        )}

        {niveau && !termine && (
          <section className="jeu">

            <div className="infos">
              <span className="pastille">{niveau}</span>
              <span>Question {numero + 1} / {liste.length}</span>
              <span>⭐ {score} point{score > 1 ? 's' : ''}</span>
            </div>

            <div className="progression">
              <div
                style={{
                  width: `${((numero + 1) / liste.length) * 100}%`
                }}
              />
            </div>

            <p className="surtitre">
              {question.type === 'qcm'
                ? 'UNE SEULE RÉPONSE'
                : question.type === 'vraiFaux'
                ? 'VRAI OU FAUX'
                : question.type === 'texte'
                ? 'RÉPONSE À ÉCRIRE'
                : 'PLUSIEURS RÉPONSES POSSIBLES'}
            </p>

            <h1 className="titre-question">{question.titre}</h1>

            {question.type === 'texte' ? (
              <input
                className="champ"
                value={texte}
                onChange={(event) => setTexte(event.target.value)}
                disabled={valide}
                placeholder="Écris ta réponse ici..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && texte.trim()) {
                    verifier();
                  }
                }}
              />
            ) : (
              <div className="propositions">
                {(question.type === 'vraiFaux'
                  ? ['Vrai', 'Faux']
                  : question.reponses
                ).map((reponse) => (
                  <button
                    key={reponse}
                    disabled={valide}
                    className={`proposition ${
                      choix.includes(reponse) ? 'selectionnee' : ''
                    }`}
                    onClick={() => choisirReponse(reponse)}
                  >
                    <span className="indicateur">
                      {question.type === 'multiple'
                        ? (choix.includes(reponse) ? '☑' : '☐')
                        : (choix.includes(reponse) ? '●' : '○')}
                    </span>
                    {reponse}
                  </button>
                ))}
              </div>
            )}

            {valide && (
              <div className={`retour ${correct ? 'succes' : 'erreur'}`}>
                <strong>
                  {correct
                    ? '✅ Bonne réponse !'
                    : '❌ Pas tout à fait !'}
                </strong>

                {!correct && (
                  <p>
                    Réponse attendue : {bonneReponseTexte()}
                  </p>
                )}
              </div>
            )}

            <div className="actions">
              <button
                className="retour-accueil"
                onClick={() => choisirNiveau('')}
              >
                ← Accueil
              </button>

              {!valide ? (
                <button
                  className="principal"
                  disabled={
                    question.type === 'texte'
                      ? !texte.trim()
                      : choix.length === 0
                  }
                  onClick={verifier}
                >
                  Valider ma réponse →
                </button>
              ) : (
                <button className="principal" onClick={suivante}>
                  {numero === liste.length - 1
                    ? 'Voir mon résultat 🏆'
                    : 'Question suivante →'}
                </button>
              )}
            </div>
          </section>
        )}

        {termine && (
          <section className="resultat">
            <div className="hero-icon">🏆</div>

            <p className="surtitre">
              NIVEAU {niveau.toUpperCase()} TERMINÉ
            </p>

            <h1>Bien joué !</h1>

            <p className="description">
              Tu as terminé les 10 questions de ce niveau.
            </p>

            <div className="score-final">
              <strong>
                {score}<span> / {liste.length}</span>
              </strong>
              <p>
                {Math.round((score / liste.length) * 100)}
                % de bonnes réponses
              </p>
            </div>

            <p className="encouragement">
              {score === liste.length
                ? 'Excellent, un sans-faute ! 🌟'
                : score >= 7
                ? 'Très bon résultat, continue comme ça ! 💜'
                : score >= 4
                ? 'Bon début, tu progresses ! 🚀'
                : 'Continue à t’entraîner, tu vas y arriver ! 💪'}
            </p>

            <div className="actions-resultat">
              <button
                className="principal"
                onClick={() => choisirNiveau(niveau)}
              >
                🔄 Rejouer ce niveau
              </button>

              <button
                className="secondaire"
                onClick={() => choisirNiveau('')}
              >
                Choisir un autre niveau
              </button>
            </div>
          </section>
        )}

        <footer>
          CyberQuiz • Apprendre la cybersécurité en s’amusant
        </footer>

      </div>
    </main>
  );
}

export default App;
