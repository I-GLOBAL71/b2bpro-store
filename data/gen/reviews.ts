/** Génération des avis clients : notes 4,2 → 5,0, commentaires réalistes francophones. */

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

// Templates 5 étoiles — enthousiaste
const T5 = [
  "Livrable reçu avant la date annoncée et d'une qualité irréprochable. Le tableau est tellement bien structuré que mon équipe l'a adopté tel quel. Je recommande les yeux fermés.",
  "Franchement impressionné par la profondeur du travail. On sent que le vendeur maîtrise son sujet sur le bout des doigts. Résultat concret dès la première semaine d'utilisation.",
  "Service au top du top ! Tout est propre, vérifié, documenté. Le guide de lecture en une page est une excellente idée. C'est ma troisième commande sur b2bpro.store et toujours pas déçu.",
  "Exactement ce que j'attendais, et même mieux. Les données sont fraîches, le formatage impeccable, et les réponses à mes questions ont été quasi immédiates. Je repasserai sans hésiter.",
  "Un travail d'orfèvre. Chaque ligne est vérifiée, les sources sont indiquées, rien à redire. Mon équipe commerciale a pu se lancer dès le lendemain. Excellent rapport qualité-prix.",
  "Commande urgente traitée en 24 h avec un professionnalisme remarquable. Le résultat dépasse ce que proposent des prestataires à 5 fois le prix. Merci pour cette réactivité !",
  "Je suis difficile et je le dis : c'est la première fois qu'un livrable data est aussi exploitable directement. Filtres bien pensés, zéro doublon, notes explicatives. Parfait.",
  "C'est simple : ce service nous a fait gagner des semaines de travail. La méthode est sérieuse, le suivi impeccable, le livrable conforme à 200 %. Je viens de recommander le pack supérieur.",
  "Très beau travail, structuré et précis. Le vendeur a même ajouté des colonnes intelligentes que je n'avais pas osé demander. Un vrai partenaire de confiance pour notre croissance.",
  "Qualité exceptionnelle pour ce tarif. Les options valent chaque euro investi. Notre direction m'a félicité pour ce travail — merci de m'avoir fait briller !",
  "Rapide, rigoureux, pédagogue. Le livrable est limpide et l'accompagnement après livraison très appréciable. b2bpro.store est devenu mon réflexe pour ce type de mission.",
  "Bluffé par la précision des données. Vérification faite sur un échantillon : zéro erreur. C'est rare enough pour être souligné. Commande les yeux fermés.",
  "Le fichier livré a transformé notre prospection : 3 rendez-vous signés la première semaine. Quand une si petite investment produit de tels résultats, on partage l'info. Merci !",
  "Communication parfaite du début à la fin, livrable au-delà des attentes, et un souci du détail qu'on ne retrouve nulle part ailleurs. Une pépite, je recommande vivement.",
];

// Templates 4,6-4,9 — très satisfait avec nuance légère
const T4_8 = [
  "Excellent travail dans l'ensemble. Le livrable est complet et exploitable, j'aurais juste aimé un peu plus d'explications sur deux colonnes — mais le vendeur a répondu à ma question dans l'heure. Je recommande.",
  "Très satisfait de la prestation. Qualité des données au rendez-vous, délai respecté. Un léger temps d'attente au départ, mais le résultat vaut largement ces quelques heures.",
  "Prestation solide et sérieuse. Le format correspond exactement à ce qui était promis. Quelques ajustements demandés, appliqués sans broncher et rapidement. Très bon professionnel.",
  "Très bon service, livré conforme et avec un vrai sens du commerce. Je prends l'option supérieure la prochaine fois tant le travail de base est convaincant. Petit bémol : pack de bienvenue un peu succinct.",
  "Le livrable est propre et la méthodologie transparente, ce que j'apprécie beaucoup. Un point de détail à corriger, corrigé dans les 2 h. Rien à dire sur le sérieux global.",
  "Commande réalisée avec professionnalisme. Le fichier est riche, parfois même trop : j'ai mis un jour à tout explorer. Une mini légende en plus et ce serait parfait. Je reviendrai.",
  "Bonne surprise que cette prestation : données fraîches, structure logique, suivi sérieux. Délai légèrement juste sur la fin mais annoncé honnêtement à l'avance. Rien de bloquant.",
  "Très bonne expérience. Le vendeur comprend vite le besoin et propose même des améliorations pertinentes. Résultat solide, quelques coquilles mineures corrigées immédiatement après ma remarque.",
  "Prestation conforme, sérieuse et rapide. L'essentiel y est : données vérifiées, format demandé respecté, communication fluide. Une documentation un peu plus détaillée serait le petit plus qui manque.",
  "Solide et fiable. Nous avons intégré le livrable dans nos outils sans friction. Deux demandes d'ajustement, deux réponses rapides et efficaces. Un très bon partenaire de travail.",
];

// Templates 4,2-4,5 — satisfait avec réserve franche
const T4_3 = [
  "Le livrable est globalement bon et répond au besoin principal. Quelques imprécisions sur les premières lignes, corrigées après échange. Le sérieux du vendeur compense ce point de vigilance.",
  "Prestation correcte et honnête. Le cœur du travail est là, la structure est propre. Il m'a fallu compléter deux ou trois points moi-même, mais pour ce tarif, le rapport reste très favorable.",
  "Satisfait de la commande malgré un début un peu lent. Une fois lancé, le travail a été livré proprement et les corrections demandées ont été faites sans discuter. Le potentiel est là.",
  "Bon rapport qualité-prix. Les données essentielles sont exactes, la présentation est soignée. J'aurais aimé un peu plus de profondeur sur certains aspects — le pack premium répondra peut-être à ça.",
  "Service efficace qui remplit sa mission. La communication peut être un peu moins réactive à certaines heures (fuseau horaire oblige), mais le résultat final est solide et l'engagement tenu.",
  "Livraison dans les temps avec un livrable utilisable dès réception. Deux remarques de mon côté : une mise en page parfois inégale, mais des données fiables. L'essentiel est sauf.",
];

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
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
  const n = Math.min(reviewsCount, 14);
  for (let i = 0; i < n; i++) {
    // La note du service est la moyenne : on tire autour
    let r: number;
    const p = rnd();
    if (serviceRating >= 4.85) r = p < 0.75 ? 5 : p < 0.95 ? 4.8 : 4.5;
    else if (serviceRating >= 4.6) r = p < 0.45 ? 5 : p < 0.85 ? 4.7 : 4.4;
    else if (serviceRating >= 4.4) r = p < 0.3 ? 5 : p < 0.75 ? 4.6 : 4.3;
    else r = p < 0.2 ? 5 : p < 0.6 ? 4.5 : 4.2;

    let comment: string;
    if (r >= 4.9) comment = pick(T5, rnd);
    else if (r >= 4.6) comment = pick(T4_8, rnd);
    else comment = pick(T4_3, rnd);

    // Correction des coquilles volontairement évitées dans les templates
    comment = comment.replace("rare enough", "suffisamment rare").replace("si petite investment", "si petite dépense");

    const [name, country] = NAMES[Math.floor(rnd() * NAMES.length)];
    reviews.push({
      authorName: name,
      country,
      rating: r,
      comment,
      orderLabel: labels[Math.floor(rnd() * labels.length)],
      daysAgo: Math.floor(3 + rnd() * 500),
    });
  }
  return reviews;
}
