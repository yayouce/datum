export function convertExcelFunctions(formula: string): string {
    // Les expressions régulières sont appliquées sur une formule "propre"
    return formula
        // SOMME(X;Y;Z) -> (X + Y + Z)
        .replace(/SOMME\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' + ')})`)
        // MOYENNE(X;Y;Z) -> ((X + Y + Z)) / count
        .replace(/MOYENNE\((.*?)\)/g, (_, values) => {
            const count = (values.match(/;/g) || []).length + 1;
            return `((${values.replace(/;/g, ' + ')})) / ${count}`;
        })
        // MIN(X;Y;Z) -> Math.min(X, Y, Z)
        .replace(/MIN\((.*?)\)/g, (_, values) => `Math.min(${values.replace(/;/g, ', ')})`)
        // MAX(X;Y;Z) -> Math.max(X, Y, Z)
        .replace(/MAX\((.*?)\)/g, (_, values) => `Math.max(${values.replace(/;/g, ', ')})`)
        // ABS(X) -> Math.abs(X)
        .replace(/ABS\((.*?)\)/g, (_, value) => `Math.abs(${value})`)
        // CONCATENER(X;Y;Z) -> "X" + "Y" + "Z"
        .replace(/CONCATENER\((.*?)\)/g, (_, values) => {
            return values.split(";").map(v => v.trim()).join(' + ');
        })
        // NB(X;Y;Z) -> Compte les valeurs non-nulles
        .replace(/NB\((.*?)\)/g, (_, values) => `(${values.split(";").map(v => `(${v.trim()} != null ? 1 : 0)`).join(" + ")})`)
        // ET(A;B;C) -> (A && B && C)
        .replace(/ET\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' && ')})`)
        // OU(A;B;C) -> (A || B || C)
        .replace(/OU\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' || ')})`)
        // SI(condition;vrai;faux)
        .replace(/SI\((.*?);(.*?);(.*?)\)/g, (_, condition, trueVal, falseVal) => {
            const operatorMatch = condition.match(/(>=|<=|>|<|==|!=|=)/);
            if (!operatorMatch) throw new Error(`Opérateur manquant dans la condition: ${condition}`);
            
            const operator = operatorMatch[0] === '=' ? '==' : operatorMatch[0];
            const [left, right] = condition.split(operatorMatch[0]).map(v => v.trim());
            
            return `(${left} ${operator} ${right} ? ${trueVal.trim()} : ${falseVal.trim()})`;
        });
}
