import { DocumentType } from '../classification';

export interface BaseExtraction {
  document_type: DocumentType;
  confidence: number;
  extracted_at: Date;
}
