import { BaseExtraction } from './base-extraction.types';
import { DocumentType } from '../classification';

export interface IDCardData extends BaseExtraction {
  document_type: DocumentType.ID_CARD;
  document_number: string;
  full_name: string;
  birth_date: string;
  issuing_date: string;
  issuing_authority?: string;
  cpf?: string;
}
