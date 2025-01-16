export function incrementColumnLetter(letter: string): string {
    const charCodes = letter.split("").map((char) => char.charCodeAt(0)); // Convertir chaque lettre en code ASCII
    let i = charCodes.length - 1;
  
    while (i >= 0) {
      charCodes[i]++; // Incrémenter la lettre
      if (charCodes[i] <= 90) break; // Si encore dans A-Z
      charCodes[i] = 65; // Retour à "A"
      i--;
    }
  
    if (i < 0) charCodes.unshift(65); // Ajouter un "A" au début si dépassement (ex : Z -> AA)
  
    return String.fromCharCode(...charCodes); // Reconstruire la lettre
  }
  