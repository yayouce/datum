// src/utils/fusion.helpers.ts

// Helper pour générer les noms de colonnes, utilisé en interne
function getExcelColumnName(index: number): string {
    let name = ''; let i = index;
    while (i >= 0) {
        name = String.fromCharCode(i % 26 + 'A'.charCodeAt(0)) + name;
        i = Math.floor(i / 26) - 1;
    }
    return name;
}

/**
 * Modifie directement l'objet `fichierEnBase` en le mettant à jour
 * avec les données du `fichierTelecharge`.
 * Ne retourne rien, fonctionne par référence.
 * @param fichierTelecharge Le nouvel objet de données parsé depuis la source distante.
 * @param fichierEnBase L'objet de données existant (ex: sourceDonnee.fichier) qui sera modifié.
 */
export function fusionnerFichiers_InPlace(fichierTelecharge: any, fichierEnBase: any): void {
    const extraireInfosEnTetes = (sheetData: any) => {
        if (!sheetData?.donnees?.length) return { headerMap: new Map<string, string>(), dataRows: [] };
        const headerRowObj = sheetData.donnees[0] || {};
        const headerMap = new Map<string, string>(); // Map<NomDeLentete, ID_Colonne_Excel>
        (sheetData.colonnes || []).forEach((colId: string) => {
            const headerCellKey = `${colId}1`;
            if (Object.prototype.hasOwnProperty.call(headerRowObj, headerCellKey)) {
                headerMap.set(String(headerRowObj[headerCellKey]), colId);
            }
        });
        return { headerMap, dataRows: sheetData.donnees.slice(1) };
    };

    for (const sheetName in fichierTelecharge) {
        if (!Object.prototype.hasOwnProperty.call(fichierTelecharge, sheetName)) continue;

        if (!fichierEnBase[sheetName]) {
            fichierEnBase[sheetName] = fichierTelecharge[sheetName];
            continue;
        }

        const infosNouveau = extraireInfosEnTetes(fichierTelecharge[sheetName]);
        const sheetEnBase = fichierEnBase[sheetName];
        const infosAncien = extraireInfosEnTetes(sheetEnBase);

        // 1. Mettre à jour les colonnes communes en écrasant les données
        for (const [nomEntete, colIdNouveau] of infosNouveau.headerMap.entries()) {
            if (infosAncien.headerMap.has(nomEntete)) {
                const colIdAncien = infosAncien.headerMap.get(nomEntete);
                for (let i = 0; i < infosNouveau.dataRows.length; i++) {
                    const numLigneExcel = i + 2;
                    const nouvelleValeur = infosNouveau.dataRows[i]?.[`${colIdNouveau}${numLigneExcel}`];
                    if (!sheetEnBase.donnees[i + 1]) sheetEnBase.donnees[i + 1] = {};
                    sheetEnBase.donnees[i + 1][`${colIdAncien}${numLigneExcel}`] = nouvelleValeur;
                }
            }
        }

        // 2. Ajouter les nouvelles colonnes qui n'existent pas dans l'ancien
        let derniereColonneIndex = sheetEnBase.colonnes.length;
        for (const [nomEntete, colIdNouveau] of infosNouveau.headerMap.entries()) {
            if (!infosAncien.headerMap.has(nomEntete)) {
                const nouvelleColId = getExcelColumnName(derniereColonneIndex++);
                sheetEnBase.colonnes.push(nouvelleColId);
                sheetEnBase.donnees[0][`${nouvelleColId}1`] = nomEntete;
                infosAncien.headerMap.set(nomEntete, nouvelleColId); // Mettre à jour la map pour la cohérence

                for (let i = 0; i < infosNouveau.dataRows.length; i++) {
                    const numLigneExcel = i + 2;
                    const nouvelleValeur = infosNouveau.dataRows[i]?.[`${colIdNouveau}${numLigneExcel}`];
                    if (!sheetEnBase.donnees[i + 1]) sheetEnBase.donnees[i + 1] = {};
                    sheetEnBase.donnees[i + 1][`${nouvelleColId}${numLigneExcel}`] = nouvelleValeur;
                }
            }
        }
        
        // 3. Tronquer ou étendre les données pour correspondre à la longueur du nouveau fichier
        sheetEnBase.donnees.length = infosNouveau.dataRows.length + 1;
    }
}