import { BaseExtraction } from './base-extraction.types';
import { DocumentType } from '../classification';

export interface PassportData extends BaseExtraction {
  document_type: DocumentType.PASSPORT;
  document_number: string;
  full_name: string;
  birth_date: string;
  expiry_date: string;
  nationality: string;
  issuing_country: string;
  sex?: string;
  place_of_birth?: string;
}
