import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileHandlerService {
    async validateFile(buffer: Buffer): Promise<string> {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
            'text/csv',  // CSV
            'application/vnd.google-earth.kml+xml',  // KML
        ];

        // Import dynamique pour éviter les erreurs d'exports
        const { fileTypeFromBuffer } = await import('file-type');

        const type = await fileTypeFromBuffer(buffer);
        if (!type || !allowedTypes.includes(type.mime)) {
            throw new BadRequestException('Format de fichier non supporté.');
        }
        return type.mime;
    }
}
