export type AuthenticatedUser = {
    iduser: string;
    role: 'admin' | 'client';
    roleMembre?: string; // seulement si role === 'client'
    structure?: { idStruct: string }; // seulement si role === 'client'
    // Ajoutez d'autres champs si nécessaire (email, etc.)
};