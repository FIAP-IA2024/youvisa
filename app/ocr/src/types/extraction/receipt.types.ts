import { BaseExtraction } from './base-extraction.types';
import { DocumentType } from '../classification';

export interface LineItem {
  description: string;
  quantity?: string;
  price: string;
}

export interface ReceiptData extends BaseExtraction {
  document_type: DocumentType.RECEIPT | DocumentType.INVOICE;
  vendor_name: string;
  total_amount: string;
  transaction_date: string;
  tax_amount?: string;
  line_items?: LineItem[];
}
