const { QueryFailedError } = require('typeorm');

// Classe d'exception personnalisée pour duplicata
class DuplicateEntryException extends Error {
    constructor(message) {
        super(message);
        this.name = 'DuplicateEntryException';
    }
}

// Middleware global pour capturer les erreurs de type duplicata
function duplicateEntryHandler(err, req, res, next) {
    if (err instanceof QueryFailedError) {
        if (err.message.includes('Duplicate entry')) {
            const duplicateError = new DuplicateEntryException('Cet email ou contact est déjà utilisé.');
            return res.status(409).json({ message: duplicateError.message });
        }
    }
    // Passe à l'erreur suivante si ce n'est pas un duplicata
    next(err);
}

module.exports = { DuplicateEntryException, duplicateEntryHandler };
