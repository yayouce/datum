/**
     * Helper de fusion pour garder la fonction principale lisible.
     * Contient la logique de fusion que vous avez développée.
     */
    export function fusionnerFichiers(fichierTelechargeTraite: any, ancienFichierComplet: any): any {
        const fichierResultatFusion = {};

        const getExcelColumnName = (index: number): string => {
            let name = ''; let i = index;
            while (i >= 0) { name = String.fromCharCode(i % 26 + 'A'.charCodeAt(0)) + name; i = Math.floor(i / 26) - 1; }
            return name;
        };

        const extraireInfosFeuille = (sheetData: any) => {
            if (!sheetData?.donnees?.length) return { headers: [], dataRows: [] };
            const headerRowObj = sheetData.donnees[0] || {};
            const headers: { name: string; colId: string }[] = [];
            const excelColIds = sheetData.colonnes || [];
            excelColIds.forEach(colId => {
                const headerCellKey = `${colId}1`;
                const name = headerRowObj.hasOwnProperty(headerCellKey) ? String(headerRowObj[headerCellKey]) : `Colonne_${colId}`;
                headers.push({ name, colId });
            });
            return { headers, dataRows: sheetData.donnees.slice(1) };
        };

        const generateUniqueHeaders = (headers: { name: string; colId: string }[]) => {
            const counts = new Map<string, number>();
            return headers.map(header => {
                const currentCount = counts.get(header.name) || 0;
                counts.set(header.name, currentCount + 1);
                const uniqueName = currentCount > 0 ? `${header.name}_${currentCount + 1}` : header.name;
                return { ...header, uniqueName };
            });
        };

        for (const sheetName in fichierTelechargeTraite) {
            if (!Object.prototype.hasOwnProperty.call(fichierTelechargeTraite, sheetName)) continue;
            
            const infosNouveau = extraireInfosFeuille(fichierTelechargeTraite[sheetName]);
            const infosAncien = extraireInfosFeuille(ancienFichierComplet[sheetName] || {});

            if (infosNouveau.headers.length === 0) {
                fichierResultatFusion[sheetName] = ancienFichierComplet[sheetName] || fichierTelechargeTraite[sheetName];
                continue;
            }

            const uniqueHeadersNouveau = generateUniqueHeaders(infosNouveau.headers);
            const uniqueHeadersAncien = generateUniqueHeaders(infosAncien.headers);
            const setNomsEntetesNouveaux = new Set(infosNouveau.headers.map(h => h.name));
            const headersAnciensA_Conserver = uniqueHeadersAncien.filter(h => !setNomsEntetesNouveaux.has(h.name));
            const finalHeaderStructure = [...uniqueHeadersNouveau, ...headersAnciensA_Conserver];
            
            const resultatFeuille = { colonnes: [], donnees: [] };
            const headerRowFinal = {};

            finalHeaderStructure.forEach((headerInfo, idx) => {
                const finalColId = getExcelColumnName(idx);
                resultatFeuille.colonnes.push(finalColId);
                headerRowFinal[`${finalColId}1`] = headerInfo.uniqueName;
            });
            resultatFeuille.donnees.push(headerRowFinal);

            const nombreLignesDataFinal = infosNouveau.dataRows.length;
            for (let i = 0; i < nombreLignesDataFinal; i++) {
                const ligneDataCouranteResultat = {};
                const numLigneExcel = i + 2;
                finalHeaderStructure.forEach((headerInfo, idx) => {
                    const finalColId = resultatFeuille.colonnes[idx];
                    let valeurCellule = null;
                    const sourceDataRow = uniqueHeadersNouveau.includes(headerInfo) 
                        ? infosNouveau.dataRows[i] 
                        : (headersAnciensA_Conserver.includes(headerInfo) ? infosAncien.dataRows[i] : null);
                    if (sourceDataRow) {
                        const originalCellKey = `${headerInfo.colId}${numLigneExcel}`;
                        valeurCellule = sourceDataRow[originalCellKey];
                    }
                    ligneDataCouranteResultat[`${finalColId}${numLigneExcel}`] = (valeurCellule !== undefined) ? valeurCellule : null;
                });
                resultatFeuille.donnees.push(ligneDataCouranteResultat);
            }
            fichierResultatFusion[sheetName] = resultatFeuille;
        }

        for (const sheetName in ancienFichierComplet) {
            if (!Object.prototype.hasOwnProperty.call(ancienFichierComplet, sheetName)) continue;
            if (!fichierResultatFusion.hasOwnProperty(sheetName)) {
                fichierResultatFusion[sheetName] = ancienFichierComplet[sheetName];
            }
        }

        return fichierResultatFusion;
    }
