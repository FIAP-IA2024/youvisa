import { DocumentType } from '../../types';
import { logger } from '../../config';

export class ClassifierService {
  classify(metadata: { mime_type?: string; file_size?: number; file_name?: string }, key: string): DocumentType {
    const filename = (metadata.file_name || key).toLowerCase();

    logger.debug('Classifying document', { filename, mime_type: metadata.mime_type });

    // Classification based on filename patterns
    if (filename.includes('passport') || filename.includes('pasaporte')) {
      return DocumentType.PASSPORT;
    }

    if (filename.includes('rg') || filename.includes('id') || filename.includes('identidade')) {
      return DocumentType.ID_CARD;
    }

    if (filename.includes('cnh') || filename.includes('driver') || filename.includes('carteira')) {
      return DocumentType.DRIVERS_LICENSE;
    }

    if (filename.includes('receipt') || filename.includes('recibo') || filename.includes('comprovante')) {
      return DocumentType.RECEIPT;
    }

    if (filename.includes('invoice') || filename.includes('nota') || filename.includes('nf')) {
      return DocumentType.INVOICE;
    }

    if (filename.includes('form') || filename.includes('formulario')) {
      return DocumentType.FORM;
    }

    logger.warn('Could not classify document, returning UNKNOWN', { filename });
    return DocumentType.UNKNOWN;
  }
}

export const classifierService = new ClassifierService();
