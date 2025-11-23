import { BaseExtraction } from './base-extraction.types';
import { DocumentType } from '../classification';

export interface FormField {
  key: string;
  value: string;
  confidence: number;
}

export interface FormData extends BaseExtraction {
  document_type: DocumentType.FORM;
  form_fields: FormField[];
  raw_text: string;
}
