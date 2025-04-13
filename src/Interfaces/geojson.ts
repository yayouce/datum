export interface GeoJsonFeature {
    type: "Feature";
    geometry: { type: string; coordinates: any } | null;
    properties: { [key: string]: any };
}


export interface GeoJsonFeatureCollection {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
    metadata?: { // Optionnel
        titre?: string;
        typeGraphique?: string;
        // ... autres méta-informations utiles
    }
}
