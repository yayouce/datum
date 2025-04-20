// src/graph/geo.service.ts (ou un nom de fichier similaire)

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    LineString,
    Point,
    Polygon
} from 'geojson' // Assurez-vous d'avoir installé @types/geojson

// --- IMPORT DES TYPES DEPUIS L'ENTITE ---
import {
    ConfigGeographique,      // Configuration géo importée
    ColonneEtiquetteConfig, // Configuration des étiquettes importée
    TypeGeometrieMap       // Enum de type de géométrie importé
} from './entities/graph.entity'; // Ajustez le chemin si nécessaire


interface ParsedSourceData {
    [groupName: string]: {
        donnees: Array<{ [cellAddress: string]: any }>; // Array d'objets représentant les lignes
    };
}


@Injectable()
export class GeoService {
    private readonly logger = new Logger(GeoService.name);

    /**
     * Fonction principale pour créer une FeatureCollection GeoJSON à partir des données sources
     * et de la configuration stockée dans l'entité Graph.
     * @param sourceData Données brutes parsées (structure attendue: ParsedSourceData)
     * @param configGeo Configuration géographique issue de l'entité Graph
     * @param etiquettesConfig Configuration des étiquettes issue de l'entité Graph
     * @param graphId Identifiant du graphique (pour le logging)
     * @returns FeatureCollection GeoJSON prête à être utilisée par une librairie carto (Leaflet, Mapbox GL, etc.)
     */
    public createGeoJsonData(
        sourceData: ParsedSourceData,
        configGeo: ConfigGeographique,
        etiquettesConfig: ColonneEtiquetteConfig[],
        graphId: string
    ): FeatureCollection {

        // --- Étapes 1 & 2: Validation Initiale et Accès au Groupe de Données ---
        // (Code de validation omis pour la concision, mais présent dans la version complète précédente)
        if (!sourceData || typeof sourceData !== 'object') throw new HttpException('Données source invalides.', HttpStatus.INTERNAL_SERVER_ERROR);
        if (!configGeo || !configGeo.feuille) throw new HttpException('Configuration géo invalide.', HttpStatus.BAD_REQUEST);
        const nomGroupe = configGeo.feuille;
        const groupeData = sourceData[nomGroupe];
        if (!groupeData || !Array.isArray(groupeData.donnees) || groupeData.donnees.length === 0) throw new HttpException(`Groupe '${nomGroupe}' introuvable ou vide.`, HttpStatus.BAD_REQUEST);
        if (!groupeData.donnees[0] || typeof groupeData.donnees[0] !== 'object') throw new HttpException(`Ligne d'en-tête invalide.`, HttpStatus.INTERNAL_SERVER_ERROR);

        // --- Étape 3: Mapper les En-têtes aux Lettres de Colonnes ---
        const headerRow = groupeData.donnees[0];
        const headerToLetterMap: { [key: string]: string } = {};
        try {
            for (const [cellAddress, headerText] of Object.entries(headerRow)) {
                if (headerText !== null && headerText !== undefined && headerText !== '') {
                   const letterMatch = cellAddress.match(/^([A-Z]+)/);
                   if (letterMatch) headerToLetterMap[String(headerText)] = letterMatch[1];
                }
            }
        } catch (error) { /* ... gestion erreur ... */ throw new HttpException('Erreur mapping en-têtes.', HttpStatus.INTERNAL_SERVER_ERROR); }

        // --- Étape 4: Préparer les informations (lettres des colonnes géo et étiquettes) ---
        const features: Feature[] = [];
        let latLetter: string | undefined, lonLetter: string | undefined, traceLetter: string | undefined;

        // Valider et récupérer les lettres des colonnes géographiques requises
        switch (configGeo.typeGeometrie) {
            case TypeGeometrieMap.POINT:
                 if (!configGeo.colonneLatitude || !configGeo.colonneLongitude) throw new HttpException(`Config POINT incomplète.`, HttpStatus.BAD_REQUEST);
                latLetter = headerToLetterMap[configGeo.colonneLatitude];
                lonLetter = headerToLetterMap[configGeo.colonneLongitude];
                if (!latLetter || !lonLetter) throw new HttpException(`En-tête Lat/Lon introuvable.`, HttpStatus.BAD_REQUEST);
                break;
            case TypeGeometrieMap.POLYGONE:
            case TypeGeometrieMap.LIGNE:
                 if (!configGeo.colonneTrace) throw new HttpException(`Config ${configGeo.typeGeometrie.toUpperCase()} incomplète.`, HttpStatus.BAD_REQUEST);
                traceLetter = headerToLetterMap[configGeo.colonneTrace];
                if (!traceLetter) throw new HttpException(`En-tête tracé introuvable.`, HttpStatus.BAD_REQUEST);
                break;
            default: throw new HttpException(`Type géo non supporté: ${configGeo.typeGeometrie}`, HttpStatus.BAD_REQUEST);
        }

        // Mapper les lettres pour les étiquettes configurées
        const mappedEtiquettes = (etiquettesConfig || []).map(etq => ({
            ...etq,
            letter: headerToLetterMap[etq.colonne]
        })).filter(etq => !!etq.letter);


        // --- Étape 5: Itérer sur les lignes de données ---
        this.logger.log(`[Graph ${graphId}] Traitement de ${groupeData.donnees.length - 1} lignes...`);
        for (let i = 1; i < groupeData.donnees.length; i++) {
            const currentRow = groupeData.donnees[i];
            const rowNum = i + 1;
            if (!currentRow || typeof currentRow !== 'object') { /* log & continue */ continue; }

            let geometry: Point | Polygon | LineString | null = null;
            const properties: GeoJsonProperties = {};

            try {
                // A. Construire la Géométrie
                switch (configGeo.typeGeometrie) {
                    case TypeGeometrieMap.POINT:
                        // Logique pour POINT reste inchangée
                        if (latLetter && lonLetter) {
                            // Attention aux headers exacts: _Point GPS_latitude et _Point GPS_longitude
                            const latValStr = currentRow[latLetter + rowNum];
                            const lonValStr = currentRow[lonLetter + rowNum];
                            const latVal = parseFloat(latValStr);
                            const lonVal = parseFloat(lonValStr);

                            if (!isNaN(latVal) && !isNaN(lonVal)) {
                                // Ordre GeoJSON: [longitude, latitude]
                                geometry = { type: 'Point', coordinates: [lonVal, latVal] };
                            } else {
                                this.logger.warn(`[Graph ${graphId}] Ligne ${rowNum}: Coordonnées POINT invalides (Lat='${latValStr}', Lon='${lonValStr}').`);
                            }
                        }
                        break; // Fin POINT

                    case TypeGeometrieMap.LIGNE:
                    case TypeGeometrieMap.POLYGONE:
                        // Assurer que la lettre de la colonne du tracé est trouvée
                        if (traceLetter) {
                            // Récupère la chaîne brute (ex: "Lat Lon Alt Prec;...")
                            const traceRawValue = currentRow[traceLetter + rowNum];

                            // --- MODIFICATION DE L'APPEL ICI ---
                            // Décide si l'altitude (3ème coordonnée) doit être incluse dans le GeoJSON.
                            // Mettre 'true' pour 3D ([Lon, Lat, Alt]), 'false' pour 2D ([Lon, Lat]).
                            // 2D ('false') est généralement le choix par défaut et le plus compatible.
                            const includeAltitudeInGeoJson = false;
                            // Appel de la fonction helper avec le flag 'includeAltitude'
                            const coordinates = this.parseCoordinateString(traceRawValue, includeAltitudeInGeoJson);
                            // --- FIN DE LA MODIFICATION DE L'APPEL ---

                            // Vérifier si le parsing a réussi et a retourné des coordonnées
                            if (coordinates && coordinates.length > 0) {
                                // Si c'est une Ligne (LineString)
                                if (configGeo.typeGeometrie === TypeGeometrieMap.LIGNE) {
                                    // Une LineString valide nécessite au moins 2 points
                                    if (coordinates.length >= 2) {
                                        geometry = { type: 'LineString', coordinates: coordinates };
                                    } else {
                                        // Log si le tracé parsé est trop court pour une ligne
                                        this.logger.warn(`[Graph ${graphId}] Ligne ${rowNum}: Tracé LIGNE invalide (moins de 2 points après parsing). Tracé: '${traceRawValue}'`);
                                    }
                                }
                                // Si c'est un Polygone (Polygon)
                                else {
                                    // Copie pour modification éventuelle (fermeture)
                                    let polygonCoordinates = [...coordinates];
                                    let isClosed = false;

                                    // Vérifier si le polygone est fermé et s'il a assez de points
                                    if(polygonCoordinates.length >= 3) { // Besoin d'au moins 3 points pour définir une surface
                                        const first = polygonCoordinates[0];
                                        const last = polygonCoordinates[polygonCoordinates.length - 1];
                                         // Vérifie si le premier et le dernier point sont identiques
                                         if (first.length === last.length && first.every((val, index) => val === last[index])) {
                                             isClosed = true;
                                         } else {
                                             // Si pas fermé, le fermer en ajoutant une copie du premier point à la fin
                                              polygonCoordinates.push([...first]);
                                             isClosed = true; // Maintenant, il est structurellement fermé
                                         }
                                    }

                                    // Un LinearRing valide (requis pour Polygon GeoJSON) doit avoir >= 4 points (incluant le point de fermeture)
                                    if (isClosed && polygonCoordinates.length >= 4) {
                                        // Structure GeoJSON Polygon: coordinates est un tableau de rings [exteriorRing, hole1, hole2...]
                                        geometry = { type: 'Polygon', coordinates: [polygonCoordinates] };
                                    } else {
                                        // Log si le tracé parsé ne forme pas un polygone valide
                                         this.logger.warn(`[Graph ${graphId}] Ligne ${rowNum}: Tracé POLYGONE invalide (moins de 3 points uniques ou tracé non fermable après parsing). Tracé: '${traceRawValue}'`);
                                    }
                                }
                            } else {
                                // Log si le parsing de la chaîne a échoué (retourné null ou vide),
                                // mais seulement si la cellule source n'était pas vide à l'origine.
                                if (traceRawValue !== null && traceRawValue !== undefined && String(traceRawValue).trim() !== '') {
                                     this.logger.warn(`[Graph ${graphId}] Ligne ${rowNum}: Impossible de parser le tracé ${configGeo.typeGeometrie.toUpperCase()}. Tracé dans cellule: '${traceRawValue}'`);
                                }
                            }
                        }
                        break; // Fin LIGNE/POLYGONE
                    // case TypeGeometrieMap.CHOROPLETHE:
                    //     // ... Logique pour choroplethe ici ...
                    //     break;
                    default:
                        // Ce cas ne devrait pas arriver si la validation est correcte en amont
                         this.logger.error(`[Graph ${graphId}] Ligne ${rowNum}: Type de géométrie non géré rencontré: ${configGeo.typeGeometrie}`);

                } // Fin du switch (configGeo.typeGeometrie)

                // B. Si une géométrie valide a été créée, extraire les propriétés
                if (geometry) {
                     // Extraire les propriétés définies dans etiquettesConfig
                    // for (const etq of mappedEtiquettes) {
                    //     // etq.letter est garanti d'être défini ici grâce au .filter() préalable
                    //     const propValue = currentRow[etq.letter! + rowNum];
                    //     properties[etq.libelleAffichage] = propValue ?? null; // Utilise le libellé comme clé, gère null/undefined
                    // }

                    // C. Ajouter la Feature (Géométrie + Propriétés) au tableau
                    features.push({
                        type: 'Feature',
                        geometry: geometry,
                        properties: properties,
                    });
                }
                 // Si 'geometry' est resté 'null' après le switch, la ligne est simplement ignorée
                 // (car invalide ou non parseable - un warning a dû être loggué plus haut si pertinent)

            } catch (error) {
                // Attrape les erreurs inattendues pendant le traitement de la ligne
                this.logger.error(`[Graph ${graphId}] Erreur critique lors du traitement de la ligne ${rowNum}. Ligne ignorée. Erreur:`, error);
                // Décider si continuer ou arrêter le processus global ici
                // Par exemple: throw new HttpException(`Erreur interne ligne ${rowNum}`, HttpStatus.INTERNAL_SERVER_ERROR);
            } // Fin du try...catch pour une ligne
        } // Fin boucle lignes

        // --- Étape 6: Retourner la FeatureCollection ---
        this.logger.log(`[Graph ${graphId}] ${features.length} features créées.`);
        return {
            type: 'FeatureCollection',
            features: features,
        };
    } // Fin de createGeoJsonData

    /**
     * Fonction utilitaire privée pour parser une chaîne de coordonnées.
     * Attend "lon,lat;lon,lat;..." ou "lon lat;lon lat;...".
     * @param coordString La chaîne brute (any type).
     * @returns number[][] ([lon, lat][]) ou null.
     */
    private parseCoordinateString(coordString: any, includeAltitude: boolean = false): number[][] | null {
        // Gérer les types non-string ou vides
        if (coordString === null || coordString === undefined) return null;
        const str = String(coordString).trim(); // Convertit en string et nettoie
        if (str === '') return null;

        try {
            // Séparateurs attendus selon l'exemple fourni
            const pointSeparator = ';';
            const valueSeparator = /\s+/; // Sépare par un ou plusieurs espaces

            // Découpe en segments (un par point)
            const segments = str.split(pointSeparator)
                .map(segmentStr => segmentStr.trim()) // Nettoyer chaque segment
                .filter(segmentStr => segmentStr !== ''); // Enlever les segments vides

            if (segments.length === 0) return null; // Si la chaîne ne contenait que des ';' ou était vide

            const coordinates: number[][] = [];
            for (const segment of segments) {
                 // Découpe chaque segment en valeurs (attend Lat Lon Alt Prec)
                const values = segment.split(valueSeparator).map(numStr => parseFloat(numStr.trim()));

                // Vérifie si on a bien 4 nombres valides après parsing
                if (values.length === 4 && !isNaN(values[0]) && !isNaN(values[1]) && !isNaN(values[2]) && !isNaN(values[3])) {
                    const latitude = values[0];
                    const longitude = values[1];
                    const altitude = values[2];
                    // const precision = values[3]; // La précision n'est PAS incluse dans les coordonnées GeoJSON

                    // Construit le tableau de coordonnées dans l'ordre GeoJSON [Lon, Lat, Alt?]
                    if (includeAltitude) {
                        coordinates.push([longitude, latitude, altitude]); // Format 3D
                    } else {
                        coordinates.push([longitude, latitude]); // Format 2D par défaut
                    }
                } else {
                    // Si un segment n'a pas 4 nombres valides, on considère toute la chaîne comme invalide
                    this.logger.warn(`Segment de coordonnées invalide (attendait 4 nombres: Lat Lon Alt Prec): "${segment}" dans la chaîne complète "${str}"`);
                    return null; // Rejette toute la chaîne
                }
            }

            // Si tous les segments étaient valides
            return coordinates.length > 0 ? coordinates : null; // Retourne null seulement si aucun segment valide n'a été trouvé

        } catch (error) {
            this.logger.error(`Erreur de parsing inattendue de la chaîne de coordonnées: "${str}"`, error);
            return null; // Retourne null en cas d'erreur
        }
    }




    

} 