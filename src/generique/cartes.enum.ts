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


    // --- Graphiques Géospatiaux ---
    CARTE_POINTS = "Carte_de_points",               //juste besoin de longitude et lattitude
    CARTE_POLYGONE = "Carte_de_polygones",           
    CARTE_LIGNE = "Carte_de_lignes",                 
    
    //carte importé
    CARTE_IMPORTEE = "Carte_importee",
}

// --- Enum pour les types de géométrie ---
export enum TypeGeometrieMap {
    POINT = 'point',
    POLYGONE = 'polygone',
    LIGNE = 'ligne',
  
  }