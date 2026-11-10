/** Génération des avis clients : notes 4,2 → 5,0, commentaires réalistes francophones.
 *
 * v2 (humanisation) : le pool initial (31 textes recyclés sur 1 319 avis) est
 * étendu à 124 textes rédigés, répartis par niveau de note, complétés d'une
 * contextualisation déterministe (option commandée / délai de livraison).
 * La sélection est partagée entre generateReviews (futurs seeds) et le script
 * scripts/humanize-reviews.ts (base existante) : un triplet (clé, note, option)
 * produit TOUJOURS le même commentaire, d'où une idempotence par déterminisme.
 */

export interface ReviewSeed {
  authorName: string;
  country: string;
  rating: number;
  comment: string;
  orderLabel: string;
  daysAgo: number;
}

// Noms de clients francophones (France, Québec, Afrique, Belgique, Suisse...)
const NAMES: [string, string][] = [
  ["Marc Lefèvre", "FR"], ["Sandrine Aubry", "FR"], ["Olivier Brancart", "FR"], ["Nathalie Perrin", "FR"],
  ["Kevin Ollivier", "FR"], ["Céline Dubosc", "FR"], ["Frédéric Vasseur", "FR"], ["Mélanie Roux", "FR"],
  ["Damien Charrier", "FR"], ["Aurélie Tissot", "FR"], ["Gilles Renard", "FR"], ["Stéphanie Aubert", "FR"],
  ["Hugo Lambert", "FR"], ["Pauline Colin", "FR"], ["Étienne Marchal", "FR"], ["Claire Bonnard", "FR"],
  ["Mathieu Delcourt", "FR"], ["Sarah Nguyen", "FR"], ["Vincent Charpentier", "FR"], ["Laure Petitjean", "FR"],
  ["François-Xavier Morel", "FR"], ["Emmanuelle Roy", "FR"], ["Sébastien Fournier", "FR"], ["Coralie Prévost", "FR"],
  ["Guillaume Dufour", "CA"], ["Isabelle Charest", "CA"], ["Patrick Sévigny", "CA"], ["Julie Auclair", "CA"],
  ["Mathieu Lapointe", "CA"], ["Roxanne Côté", "CA"], ["David Bérubé", "CA"], ["Catherine Piché", "CA"],
  ["Simon Girard", "CA"], ["Vanessa Turcotte", "CA"], ["Éric Cadrin", "CA"], ["Marianne Fontaine", "CA"],
  ["Oumar Sy", "SN"], ["Awa Ba", "SN"], ["Cheikh Fall", "SN"], ["Mariama Sow", "SN"],
  ["Modou Diagne", "SN"], ["Khady Camara", "SN"], ["Ibrahima Sarr", "SN"], ["Aminata Touré", "SN"],
  ["Jean-Marc Kouassi", "CI"], ["Adjoua Brou", "CI"], ["Yves Konan", "CI"], ["Afi Ekpé", "CI"],
  ["Serge Zadi", "CI"], ["Marie Gbagbo", "CI"], ["Didier Tapé", "CI"], ["Estelle Amani", "CI"],
  ["Roger Mbarga", "CM"], ["Sandrine Ngo Bell", "CM"], ["Alain Fogang", "CM"], ["Clarisse Fotso", "CM"],
  ["Paul Etoundi", "CM"], ["Léa Tchoumi", "CM"], ["Brice Kamdem", "CM"], ["Nadège Abena", "CM"],
  ["Youssef Amrani", "MA"], ["Salma Bennani", "MA"], ["Karim Alaoui", "MA"], ["Hicham Sabri", "MA"],
  ["Sanaa Idrissi", "MA"], ["Omar Tazi", "MA"], ["Rachid Cherkaoui", "MA"], ["Lamia Fassi", "MA"],
  ["Georges Kabila", "CD"], ["Espérance Ilunga", "CD"], ["Joseph Kasongo", "CD"], ["Chantal Mujinga", "CD"],
  ["Fabien Lumbu", "CD"], ["Grâce Nsimba", "CD"], ["Michel Tshibangu", "CD"], ["Béatrice Kalala", "CD"],
  ["Laurent Dubois", "BE"], ["Sophie Peeters", "BE"], ["Thomas Janssens", "BE"], ["Camille De Smet", "BE"],
  ["Nicolas Willems", "BE"], ["Émilie Lambert", "BE"], ["Benoît Vermeulen", "BE"], ["Alicia Brochier", "BE"],
  ["Antoine Rochat", "CH"], ["Julie Bonvin", "CH"], ["Luc Favre", "CH"], ["Nina Vuilleumier", "CH"],
  ["Pierre-André Meyer", "CH"], ["Elodie Girardet", "CH"], ["Cédric Besson", "CH"], ["Manuelle Béguelin", "CH"],
  ["Ibrahim Traoré", "BF"], ["Aïcha Ouédraogo", "BF"], ["Moussa Kaboré", "BF"], ["Rasmané Zongo", "BF"],
  ["Salif Diarra", "ML"], ["Kadiatou Samaké", "ML"], ["Modibo Keïta", "ML"], ["Fanta Coulibaly", "ML"],
  ["Lansana Camara", "GN"], ["Fatoumata Bah", "GN"], ["Sékou Condé", "GN"], ["Mariama Sylla", "GN"],
  ["Karim Aboubacar", "TN"], ["Nour Ben Salah", "TN"], ["Slim Gharbi", "TN"], ["Ines Trabelsi", "TN"],
  ["Jean Zinsou", "BJ"], ["Grace Adjo", "BJ"], ["Espoir Sossou", "BJ"], ["Reine Hounkpatin", "BJ"],
  ["Kossi Adjenou", "TG"], ["Afidé Kponton", "TG"], ["Yao Amégan", "TG"], ["Akouwa Bodjona", "TG"],
  ["Guy Minko", "GA"], ["Prisca Ndong", "GA"], ["Aimé Obame", "GA"], ["Lucrèce Moussavou", "GA"],
];

// ─── Pool v2 : textes 5 étoiles (enthousiasme mesuré, tons variés) ──────────
// Tous autonomes et recontextualisables : aucun service précis n'y est nommé.
const POOL_5: string[] = [
  // Textes courts (< 60 caractères), comme on en trouve sur toute marketplace
  "Impeccable.",
  "Rien à redire, je recommande.",
  "Livré avant la date. Parfait.",
  "Conforme, propre, rapide.",
  "Rapide et soigné. Rien à ajouter.",
  "Très bon travail, je repasse.",
  // Réactions détaillées
  "Fichier propre, colonnes bien nommées, zéro doublon. Je l'ai intégré à notre outil interne le jour même, sans la moindre retouche.",
  "On avait un dossier à monter en 48 h et le tableau est arrivé le lendemain matin. Franchement, ça nous a sauvé la mise.",
  "Première commande de ce type pour moi et c'est une agréable surprise. Les données sont propres et le tri vraiment pertinent.",
  "J'ai posé trois questions avant de commander, réponse en une demi-heure à chaque fois. Et le livrable suit le même niveau de sérieux.",
  "Pour le prix, honnêtement, je ne m'attendais pas à ça. Vérification faite sur un échantillon de cinquante lignes : aucune erreur.",
  "Le prestataire a repris ma demande à zéro quand il a vu que mon brief était mal formulé. Résultat nickel. Ce genre d'attention, ça se note.",
  "Tableau bien trié, sources datées, noms normalisés. Mes collègues ont cru que j'avais passé une semaine dessus.",
  "Reçu en avance sur l'annonce, avec une note de lecture de deux paragraphes qui détaille la méthode. Très sérieux.",
  "Je cherchais des données à jour pour un comité de direction. Livré en 24 h, zéro ligne vide, tout sourcé. Parfait.",
  "Deuxième commande et toujours la même rigueur. Les colonnes sont stables d'un fichier à l'autre, ce qui facilite les fusions.",
  "Support très réactif. Petit souci d'encodage à l'ouverture du fichier, réglé en vingt minutes avec une version corrigée.",
  "On sent l'expertise. Le choix des champs va au-delà de ce que j'avais listé dans le brief, et chaque ajout est pertinent.",
  "Franchement, pour une première collaboration, c'est rare de voir un livrable aussi carré. Les vérifications sont documentées ligne par ligne.",
  "Fichier Excel bien structuré, onglets logiques, en-têtes clairs. Même notre stagiaire a compris comment l'utiliser en dix minutes.",
  "Le PDF de synthèse est lisible et le détail est dans les onglets. Exactement le format qu'il nous fallait pour la présentation.",
  "Commandé un vendredi soir en urgence, livré le dimanche, avec un contrôle qualité en bonus. Chapeau.",
  "Aucun doublon, coordonnées vérifiées, tout est daté. C'est la troisième liste que j'achète de ce type et le niveau ne baisse pas.",
  "Ma demande était un peu atypique et le prestataire a pris le temps de la cadrer avant de se lancer. Livrable impeccable.",
  "Très pro. Le fichier est exploitable directement, les doublons ont été nettoyés en amont et la méthode est expliquée simplement.",
  "Rien à jeter dans ce livrable. Chaque colonne sert à quelque chose, chaque ligne est vérifiable. Excellent boulot.",
  // Anciens templates v1, corrigés (marque retirée, anglicismes et tiret long supprimés)
  "Livrable reçu avant la date annoncée et d'une qualité irréprochable. Le tableau est tellement bien structuré que mon équipe l'a adopté tel quel. Je recommande les yeux fermés.",
  "La profondeur du travail est franchement impressionnante. On sent que le vendeur maîtrise son sujet sur le bout des doigts. Résultat concret dès la première semaine d'utilisation.",
  "Service au top ! Tout est propre, vérifié, documenté. Le guide de lecture en une page est une excellente idée. C'est ma troisième commande et toujours aucune déception.",
  "Exactement ce que j'attendais, et même mieux. Les données sont fraîches, le formatage impeccable, et les réponses à mes questions ont été quasi immédiates. Je repasserai sans hésiter.",
  "Un travail d'orfèvre. Chaque ligne est vérifiée, les sources sont indiquées, rien à redire. Mon équipe commerciale a pu se lancer dès le lendemain. Excellent rapport qualité-prix.",
  "Commande urgente traitée en 24 h avec un professionnalisme remarquable. Le résultat dépasse ce que proposent des prestataires bien plus chers. Merci pour cette réactivité !",
  "Je suis difficile et je le dis : c'est la première fois qu'un livrable data est aussi exploitable directement. Filtres bien pensés, zéro doublon, notes explicatives. Parfait.",
  "C'est simple : ce service nous a fait gagner des semaines de travail. La méthode est sérieuse, le suivi impeccable, le livrable conforme au brief. Je viens de recommander le pack supérieur.",
  "Très beau travail, structuré et précis. Le vendeur a même ajouté des colonnes intelligentes que je n'avais pas osé demander. Un vrai partenaire de confiance pour notre croissance.",
  "Qualité exceptionnelle pour ce tarif. Les options valent chaque euro investi. Notre direction m'a félicité pour ce travail, merci de m'avoir fait briller !",
  "Rapide, rigoureux, pédagogue. Le livrable est limpide et l'accompagnement après livraison très appréciable. C'est devenu mon réflexe pour ce type de mission.",
  "Précision des données bluffante. Vérification faite sur un échantillon : zéro erreur. C'est suffisamment rare pour être souligné. Commandez sans hésiter.",
  "Le fichier livré a transformé notre prospection : 3 rendez-vous signés la première semaine. Quand une petite dépense produit de tels résultats, on partage l'info. Merci !",
  "Communication parfaite du début à la fin, livrable au-delà des attentes, et un souci du détail qu'on ne retrouve pas partout. Une pépite, je recommande vivement.",
];

// ─── Pool v2 : textes 4,6 à 4,9 (très satisfait, UNE réserve concrète) ─────
const POOL_4_HIGH: string[] = [
  "Très bien, livraison rapide.",
  "Solide, je recommande.",
  "Conforme et rapide.",
  "Très bon, je repasserai.",
  "Très satisfaisante, cette prestation. Le fichier est complet et bien organisé, j'aurais juste aimé un onglet méthode en plus. Le vendeur me l'a envoyé après coup, d'ailleurs.",
  "Bon travail, données fiables sur l'échantillon que j'ai contrôlé. Délai un peu juste sur la fin mais annoncé honnêtement, donc rien à reprocher.",
  "Livrable solide. Le format Excel demandait deux petites adaptations pour mes imports, rien de bloquant. Le fond, lui, est excellent.",
  "Prestation sérieuse. Il manquait une colonne promise dans le brief, ajoutée en une heure après mon message. Je garde l'adresse.",
  "Très bon prestataire. Le tarif final dépasse un peu l'estimation initiale, mais le volume livré justifie l'écart. Je préfère le dire franchement.",
  "Rien à dire sur le fond, tout est vérifié et propre. La communication a été lente le premier jour, ensuite nickel.",
  "Très content du résultat. Le tri par région est pertinent, j'aurais aimé un filtre par taille d'entreprise en bonus. Peut-être une future option.",
  "Fichier riche et exploitable. Toutes les coordonnées ne sont pas vérifiées une à une, mais le taux de retour est bon. Je recommande quand même.",
  "Commande conforme, livrée dans les temps. Le sommaire du PDF gagnerait à être plus détaillé, mais le contenu lui-même est très bon.",
  "Solide. Les réponses à mes questions avant commande étaient claires et le livrable tient les promesses. Un léger retard d'une demi-journée, annoncé par message.",
  "Très bien pour une première commande. Les libellés ne sont pas tous uniformes, un petit rechercher-remplacer et c'était réglé. Le reste est propre.",
  "Prestation au-dessus de la moyenne. Le fichier contenait quelques doublons de société entre onglets, signalés et corrigés dans l'heure. Sérieux.",
  "Bon achat. La structure du fichier est logique et documentée. J'aurais préféré un export CSV en plus de l'Excel, mais la conversion a pris deux minutes.",
  "Le travail est précis et livré vite. Seul bémol : deux ou trois coordonnées périmées sur l'échantillon testé, dans la norme du marché toutefois.",
  "Vraiment satisfaisante, cette prestation. J'ai demandé une retouche sur les en-têtes, faite dans l'heure. Le cœur du fichier est exactement ce que j'espérais.",
  "Très bonne prestation dans l'ensemble. Le guide d'utilisation est un peu succinct pour un fichier aussi riche, mais tout reste lisible.",
  "Commande réussie. Le prestataire a adapté le format sans frais quand il a compris mon usage. Seule ombre : la date de collecte n'était pas indiquée partout.",
  "Je recommande. Livrable complet, réponses rapides. Un léger manque d'explications sur deux colonnes calculées, mais le vendeur a clarifié tout de suite.",
  "Très pro. Livré un jour après l'annonce, avec toutes les lignes sourcées. Une coquille dans un onglet sur trois, corrigée aussitôt signalée.",
  "Bon rapport qualité-prix. Le fichier m'a servi dès le lendemain en réunion. Quelques cellules à recaler côté format de date, rien de grave.",
  "Prestataire fiable. Il a même anticipé une question de conformité que je n'avais pas posée. Le livrable mériterait juste un index des onglets.",
  "Très bien reçue, cette commande. Le tri demandé était bon, seuls deux intitulés méritaient une précision. Le vendeur les a commentés proprement.",
  // Anciens templates v1 (tiret long du premier remplacé par une virgule)
  "Excellent travail dans l'ensemble. Le livrable est complet et exploitable, j'aurais juste aimé un peu plus d'explications sur deux colonnes, mais le vendeur a répondu à ma question dans l'heure. Je recommande.",
  "Prestation très satisfaisante. Qualité des données au rendez-vous, délai respecté. Un léger temps d'attente au départ, mais le résultat vaut largement ces quelques heures.",
  "Prestation solide et sérieuse. Le format correspond exactement à ce qui était promis. Quelques ajustements demandés, appliqués sans broncher et rapidement. Très bon professionnel.",
  "Très bon service, livré conforme et avec un vrai sens du commerce. Je prends l'option supérieure la prochaine fois tant le travail de base est convaincant. Petit bémol : pack de bienvenue un peu succinct.",
  "Le livrable est propre et la méthodologie transparente, ce que j'apprécie beaucoup. Un point de détail signalé, corrigé en moins de 2 h. Rien à dire sur le sérieux global.",
  "Commande réalisée avec professionnalisme. Le fichier est riche, parfois même trop : j'ai mis un jour à tout explorer. Une mini légende en plus et ce serait parfait. Je reviendrai.",
  "Bonne surprise que cette prestation : données fraîches, structure logique, suivi sérieux. Délai un peu serré sur la fin, mais le vendeur avait prévenu à temps. Rien de bloquant.",
  "Très bonne expérience. Le vendeur comprend vite le besoin et propose même des améliorations pertinentes. Résultat solide, quelques coquilles mineures corrigées immédiatement après ma remarque.",
  "Prestation conforme, sérieuse et rapide. L'essentiel y est : données vérifiées, format demandé respecté, communication fluide. Une documentation un peu plus détaillée serait le petit plus qui manque.",
  "Solide et fiable. Nous avons intégré le livrable dans nos outils sans friction. Deux demandes d'ajustement, deux réponses rapides et efficaces. Un très bon partenaire de travail.",
];

// ─── Pool v2 : textes 4,0 à 4,5 (satisfait, réserve franche) ───────────────
const POOL_4_LOW: string[] = [
  "Correct pour le prix.",
  "Ça fait le boulot.",
  "Bien, avec un bémol sur la finition.",
  "Utile, malgré quelques scories.",
  "Le livrable répond au besoin, c'est l'essentiel. La structure est propre mais j'ai dû refaire le tri sur une colonne. Pour le prix, ça passe.",
  "Correct sans plus. Les données sont là, le fichier est lisible, mais j'espérais un peu plus de profondeur dans l'analyse.",
  "Bon fond, forme perfectible. J'ai relancé deux fois pour avoir le fichier, ensuite tout est arrivé d'un coup. Le résultat reste utile.",
  "Ça fait l'affaire. Quelques lignes à compléter moi-même et deux formats de date mélangés, mais l'essentiel est exploitable.",
  "Concluant, avec réserve. La moitié des colonnes est très pertinente, l'autre fait du remplissage. J'aurais aimé plus de sélectivité.",
  "Prestation honnête. Le fichier est complet mais la mise à jour datait de quelques mois sur une partie des lignes. À vérifier selon votre usage.",
  "Utilisable rapidement, c'est déjà ça. Deux demandes de correction : la première ignorée, la deuxième bien prise en compte. Mitigé sur le suivi.",
  "Le contenu est pertinent, la présentation un peu brute. Un passage à la loupe sur les intitulés aurait aidé. Reste un bon rapport qualité-prix.",
  "Reçu dans les temps et conforme en gros. Trois colonnes vides sur la fin du fichier, le vendeur m'a expliqué pourquoi. Ça se défend.",
  "Fichier correct, données majoritairement vérifiées. J'ai trouvé environ 5 % de lignes périmées sur mon échantillon. À prendre en compte.",
  "Ça m'a dépanné pour un premier jet. Le tri demandé a été fait à moitié, j'ai terminé moi-même. Le prix reste raisonnable pour le volume.",
  "Bon service, mais communication à améliorer. Une question simple m'a pris deux jours à obtenir. Le livrable, lui, est conforme.",
  "Le fond est là, la finition manque. En-têtes à renommer, quelques doublons à purger. Une heure de nettoyage et le fichier est devenu bon.",
  "Le format PDF me convainc moyennement, j'aurais préféré un tableau. Le contenu est sérieux, c'est ce qui sauve la note.",
  "Pour le prix, j'ai ce qu'il me faut. Rien de spectaculaire, mais des données utilisables et un vendeur qui répond. Correct.",
  "Livraison rapide, contenu un peu superficiel par endroits. Les sources sont indiquées, ça rassure. Je prendrai l'option au-dessus la prochaine fois.",
  "Fichier globalement propre. J'ai signalé une incohérence entre deux onglets, jamais corrigée, mais elle est mineure. Bon rapport qualité-prix malgré tout.",
  "Ce n'est pas du sur-mesure, mais ça marche. Les colonnes essentielles sont fiables, les autres un peu approximatives.",
  "Service correct. J'ai obtenu ce que j'ai payé, sans surprise dans un sens comme dans l'autre. Les données ont tenu leur promesse.",
  "Réponse lente au premier message, ensuite plus fluide. Le livrable est acceptable : bon volume, fraîcheur moyenne. Ça reste un choix défendable.",
  "Livrable reçu avec deux jours de retard, annoncé seulement à moitié. Le contenu compense en partie. Je note honnêtement.",
  "Fait à peu près le travail demandé. La vérification de mes vingt premières lignes donne dix-sept bonnes. Pour du volume brut, ça suffit.",
  // Anciens templates v1 (tiret long remplacé par une virgule)
  "Le livrable est globalement bon et répond au besoin principal. Quelques imprécisions sur les premières lignes, corrigées après échange. Le sérieux du vendeur compense ce point de vigilance.",
  "Prestation correcte et honnête. Le cœur du travail est là, la structure est propre. Il m'a fallu compléter deux ou trois points moi-même, mais pour ce tarif, le rapport reste très favorable.",
  "Commande satisfaisante malgré un début un peu lent. Une fois lancé, le travail a été livré proprement et les corrections demandées ont été faites sans discuter. Le potentiel est là.",
  "Bon rapport qualité-prix. Les données essentielles sont exactes, la présentation est soignée. J'aurais aimé un peu plus de profondeur sur certains aspects, le pack premium répondra peut-être à ça.",
  "Service efficace qui remplit sa mission. La communication peut être un peu moins réactive à certaines heures, fuseau horaire oblige, mais le résultat final est solide et l'engagement tenu.",
  "Livraison dans les temps avec un livrable utilisable dès réception. Deux remarques de mon côté : une mise en page parfois inégale, mais des données fiables. L'essentiel est sauf.",
];

// ─── Pool v2 : textes 3 étoiles (mitigé honnête) ────────────────────────────
const POOL_3: string[] = [
  "Livré, conforme en partie. Le fichier est lisible mais j'ai dû retravailler le tri et compléter quelques lignes. Ça m'a fait gagner du temps, pas autant que prévu.",
  "Pertinent mais superficiel. Les grandes lignes sont bonnes, le détail s'arrête vite. Pour défricher un sujet, ça va ; pour décider, ça se discute.",
  "Correct, sans enthousiasme. Les données sont présentes, la fraîcheur est moyenne et la mise en forme minimale. Le vendeur a répondu, c'est déjà ça.",
  "Dans la moyenne. Rien de cassé, rien d'excellent. J'ai trouvé quelques doublons et une colonne mal alignée, le reste passe.",
  "Ça dépend de ce que vous en faites. Pour un premier aperçu, le fichier suffit. Pour de la prospection directe, comptez un travail de nettoyage.",
  "Reçu avec du retard et sans explication au départ. Le contenu est moyen mais honnête. Je ne regrette pas totalement l'achat.",
  "Le volume est là, la qualité est variable. Environ une ligne sur cinq m'a semblé à revoir. Le format, lui, est propre.",
  "Prestation en demi-teinte. Le brief a été compris à moitié : les champs demandés sont là, ceux que j'avais précisés en option manquent. Le vendeur a proposé un geste commercial.",
  "Utilisable après nettoyage. J'ai passé une soirée à fusionner des doublons et normaliser les noms. Le résultat me convient, mais le chemin fut long.",
  "Moyen. Le fichier correspond peu ou prou à la description, avec des données un peu datées sur un tiers des lignes. La réponse du vendeur fut rapide, c'est le principal.",
];

// ─── Pool v2 : textes 2 étoiles (déceptions précises, sans haine) ──────────
const POOL_2: string[] = [
  "Décevant. Sur 200 lignes annoncées, un quart était vide ou en doublon. Le vendeur a reconnu le problème et remboursé en partie, mais je reste sur ma faim.",
  "Données obsolètes. La majorité des contacts dataient d'avant la restructuration du secteur. Inexploitable pour mon besoin précis, dommage.",
  "Non conforme au brief. J'avais demandé un tri par département et des coordonnées vérifiées : ni l'un ni l'autre. Le remboursement a été prompt, je le précise.",
  "Colonnes vides et intitulés confus. J'ai relancé trois fois pour un fichier corrigé, reçu incomplet. La communication a fini par s'arrêter. À revoir sérieusement.",
];

// ─── Pool v2 : textes 1 étoile (échec factuel, ton crédible) ───────────────
const POOL_1: string[] = [
  "Commande jamais finalisée malgré deux relances. Je comprends qu'un aléa arrive, mais aucune réponse depuis dix jours, c'est trop. Remboursement intégral obtenu, heureusement.",
  "Fichier illisible à l'arrivée, format cassé, aucune réponse à mes messages. C'est le premier avis sévère de ma vie, mais il se justifie.",
];

// ─── Contextualisation déterministe ────────────────────────────────────────
// Phrases autonomes (majuscule initiale, point final) collées au texte de base
// en préfixe ou en suffixe : l'assemblage reste grammatical car les deux
// morceaux sont des phrases complètes séparées par un point.

const CTX_DELAY: string[] = [
  "Reçu en 48 h.",
  "Livré sous deux jours.",
  "Délai de 24 h respecté.",
  "Reçu plus vite que prévu.",
  "Fichier reçu le lendemain de la commande.",
  "Trois jours d'attente, ça reste raisonnable.",
  "Reçu un jour avant l'annonce.",
  "Livraison en début de semaine, comme convenu.",
  "Délai de 48 h entre la commande et la livraison.",
  "Reçu dans les 24 h, au passage.",
  "Livré le jour même.",
  "Reçu en fin de semaine, délai correct.",
];

/** Formulations dédiées à l'option « Offre de base » (sans nommer le libellé). */
const CTX_BASE_OFFER: string[] = [
  "Commande de base, mais déjà complète.",
  "Pour la formule de base, c'est très bon.",
  "Entrée de gamme, aucun regret.",
  "La formule de base suffit pour ce besoin.",
  "Même au niveau de base, c'est propre.",
  "Commande simple, résultat au rendez-vous.",
  "Pour un premier essai, c'était le bon choix.",
  "L'offre de base fait déjà le travail.",
];

/** Formulations génériques où {label} reçoit le nom de l'option commandée. */
const CTX_OPTION: string[] = [
  "Pour l'option « {label} », aucun regret.",
  "J'ai pris l'option « {label} » : bon choix.",
  "L'option « {label} » valait son prix.",
  "Commande « {label} » reçue dans les délais.",
  "Avec l'option « {label} », on est tranquille.",
  "Sur l'option « {label} », je referais le même choix.",
  "L'option « {label} » couvre bien mon besoin.",
  "Commande passée en « {label} », livraison nickel.",
];

/** Hash FNV-1a 32 bits : stable, rapide, suffisant pour une répartition régulière. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Pool de textes correspondant à une note donnée (bornes incluses). */
export function poolForRating(rating: number): string[] {
  if (rating >= 4.9) return POOL_5;
  if (rating >= 4.55) return POOL_4_HIGH;
  if (rating >= 3.9) return POOL_4_LOW;
  if (rating >= 2.9) return POOL_3;
  if (rating >= 1.9) return POOL_2;
  return POOL_1;
}

/** Construit la permutation déterministe des phrases contextuelles pour une clé.
 *  Délais et mentions d'option sont entrelacés à partir d'un offset issu du hash :
 *  deux avis ne partagent leurs phrases que si leurs hash entrent en collision. */
function buildContextPhrases(key: string, orderLabel: string): string[] {
  const label = (orderLabel || "").trim();
  const h = fnv1a(key + "|ctx");
  const dStart = h % CTX_DELAY.length;
  const delays = [...CTX_DELAY.slice(dStart), ...CTX_DELAY.slice(0, dStart)];
  let options: string[] = [];
  if (label) {
    const source = label.toLowerCase() === "offre de base"
      ? CTX_BASE_OFFER
      : CTX_OPTION.map((p) => p.replace("{label}", label));
    const oStart = (h >>> 7) % source.length;
    options = [...source.slice(oStart), ...source.slice(0, oStart)];
  }
  const delayFirst = (h >>> 3) % 2 === 0;
  const [first, second] = delayFirst ? [delays, options] : [options, delays];
  const merged: string[] = [];
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    if (i < first.length) merged.push(first[i]);
    if (i < second.length) merged.push(second[i]);
  }
  return merged;
}

/** Nombre maximal de reprises d'un même commentaire final (garantie anti-doublon). */
export const MAX_COMMENT_REUSE = 3;

/** Sélectionne le commentaire humanisé d'un avis, de façon déterministe.
 *  `key` : identité stable de l'avis (id en base, ou « seed#index » au seed).
 *  `usage` : compteur global des commentaires déjà assignés. Le résultat ne
 *  dépend que de (key, rating, orderLabel) et de l'ordre de traitement (id
 *  ascendant) : rejouer le calcul sur les mêmes données redonne exactement
 *  les mêmes commentaires, d'où l'idempotence du script d'application.
 *
 *  Politique asymétrique anti-collision :
 *   • un avis « sans contexte » (~60 %) garde son texte sec jusqu'à
 *     MAX_COMMENT_REUSE reprises : la répétition modérée d'avis courts est
 *     naturelle sur une marketplace ;
 *   • un avis « avec contexte » (~40 %) pioche la première variante encore
 *     inutilisée de sa permutation propre : c'est le levier qui porte le
 *     nombre de commentaires uniques au-delà de 900, la combinatoire
 *     (28 phrases × 2 positions par texte de base) étant très supérieure au
 *     volume d'avis par pool de note. */
export function selectHumanizedComment(
  key: string,
  rating: number,
  orderLabel: string,
  usage: Map<string, number>
): string {
  const pool = poolForRating(rating);
  const base = pool[fnv1a(key) % pool.length];
  const phrases = buildContextPhrases(key, orderLabel);
  const wantContext = fnv1a(key + "|want") % 100 < 40;
  const suffixFirst = fnv1a(key + "|pos") % 2 === 0;

  // Variantes contextuelles : phrase complète collée avant/après le texte de
  // base (les deux morceaux finissent par un point, l'assemblage reste propre).
  const bare = base;
  const contextual = phrases.map((phrase, k) => {
    const asSuffix = ((suffixFirst ? 1 : 0) + k) % 2 === 0;
    return asSuffix ? `${base} ${phrase}` : `${phrase} ${base}`;
  });

  if (wantContext) {
    const fresh = contextual.find((c) => (usage.get(c) ?? 0) === 0);
    if (fresh) return fresh;
    if ((usage.get(bare) ?? 0) < MAX_COMMENT_REUSE) return bare;
    const spare = contextual.find((c) => (usage.get(c) ?? 0) < MAX_COMMENT_REUSE);
    if (spare) return spare;
  } else {
    if ((usage.get(bare) ?? 0) < MAX_COMMENT_REUSE) return bare;
    const fresh = contextual.find((c) => (usage.get(c) ?? 0) === 0);
    if (fresh) return fresh;
    const spare = contextual.find((c) => (usage.get(c) ?? 0) < MAX_COMMENT_REUSE);
    if (spare) return spare;
  }
  // Filet de sécurité : candidat le moins utilisé (jamais atteint en pratique,
  // la combinatoire contextuelle dépasse largement le volume d'avis par pool).
  return [bare, ...contextual].reduce((best, cand) =>
    (usage.get(cand) ?? 0) < (usage.get(best) ?? 0) ? cand : best
  , bare);
}

export function generateReviews(
  seed: number,
  serviceRating: number,
  reviewsCount: number,
  optionNames: string[]
): ReviewSeed[] {
  let a = seed * 2654435761;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const labels = ["Offre de base", ...optionNames];
  const reviews: ReviewSeed[] = [];
  const usage = new Map<string, number>();
  const n = Math.min(reviewsCount, 14);
  for (let i = 0; i < n; i++) {
    // La note du service est la moyenne : on tire autour
    let r: number;
    const p = rnd();
    if (serviceRating >= 4.85) r = p < 0.75 ? 5 : p < 0.95 ? 4.8 : 4.5;
    else if (serviceRating >= 4.6) r = p < 0.45 ? 5 : p < 0.85 ? 4.7 : 4.4;
    else if (serviceRating >= 4.4) r = p < 0.3 ? 5 : p < 0.75 ? 4.6 : 4.3;
    else r = p < 0.2 ? 5 : p < 0.6 ? 4.5 : 4.2;

    const orderLabel = labels[Math.floor(rnd() * labels.length)];
    const comment = selectHumanizedComment(`${seed}#${i}`, r, orderLabel, usage);
    usage.set(comment, (usage.get(comment) ?? 0) + 1);

    const [name, country] = NAMES[Math.floor(rnd() * NAMES.length)];
    reviews.push({
      authorName: name,
      country,
      rating: r,
      comment,
      orderLabel,
      daysAgo: Math.floor(3 + rnd() * 500),
    });
  }
  return reviews;
}
