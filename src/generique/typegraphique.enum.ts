export enum typegraphiqueEnum {
    // --- Graphiques Classiques ---
    LIGNE = "Graphique_en_lignes",
    BARRES = "Graphique_en_barres",
    BARRES_HORIZONTALES = "Graphique_en_barres_horizontales",
    SECTEURS = "Graphique_en_secteurs",
    ANNEAU = "Graphique_en_anneau",
    DISPERSION = "Graphique_en_dispersion",
    BULLES = "Graphique_a_bulles",
    RADAR = "Graphique_en_radar",
    AIRE = "Graphique_en_aire",
    CHANDELIER = "Graphique_en_chandelier",
    MIXTE = "Graphique_mixte", // Peut combiner lignes et barres par exemple

    // --- Graphiques Géospatiaux ---
    CARTE_POINTS = "Carte_de_points",               // Pour afficher des marqueurs à des coordonnées Lat/Lon
    CARTE_POLYGONE = "Carte_de_polygones",           // Pour afficher des formes (parcelles, régions) définies par des tracés
    CARTE_LIGNE = "Carte_de_lignes",                 // Pour afficher des itinéraires ou des tracés linéaires
    CARTE_CHOROPLETHE = "Carte_choroplethe",         // Pour colorer des zones prédéfinies (pays, régions) selon une valeur
    // CARTE_DE_CHALEUR = "Carte_de_chaleur"         // Heatmap (optionnel, si besoin futur)
}