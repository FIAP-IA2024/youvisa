import { DocumentType, PassportData, IDCardData, ReceiptData, FormData } from '../../types';
import { logger } from '../../config';

export class MockTextractService {
  async analyzeDocument(bucket: string, key: string, docType: DocumentType): Promise<any> {
    logger.info('Mock Textract - analyzing document', { bucket, key, docType });

    const filename = key.toLowerCase();
    const now = new Date();

    switch (docType) {
      case DocumentType.PASSPORT:
        return this.mockPassport(filename, now);
      case DocumentType.ID_CARD:
        return this.mockIDCard(filename, now);
      case DocumentType.RECEIPT:
      case DocumentType.INVOICE:
        return this.mockReceipt(filename, now);
      default:
        return this.mockForm(filename, now);
    }
  }

  private mockPassport(filename: string, now: Date): PassportData {
    return {
      document_type: DocumentType.PASSPORT,
      document_number: 'BR' + Math.random().toString().slice(2, 8),
      full_name: 'Test User Mock',
      birth_date: '1990-01-01',
      expiry_date: '2030-12-31',
      nationality: 'BRA',
      issuing_country: 'Brazil',
      sex: 'M',
      place_of_birth: 'Sao Paulo',
      confidence: 0.95,
      extracted_at: now,
    };
  }

  private mockIDCard(filename: string, now: Date): IDCardData {
    return {
      document_type: DocumentType.ID_CARD,
      document_number: Math.random().toString().slice(2, 10),
      full_name: 'Test User Mock',
      birth_date: '1990-01-01',
      issuing_date: '2020-01-01',
      issuing_authority: 'SSP/SP',
      cpf: '123.456.789-00',
      confidence: 0.93,
      extracted_at: now,
    };
  }

  private mockReceipt(filename: string, now: Date): ReceiptData {
    return {
      document_type: DocumentType.RECEIPT,
      vendor_name: 'Mock Store',
      total_amount: 'R$ 100,00',
      transaction_date: now.toISOString().split('T')[0],
      tax_amount: 'R$ 10,00',
      line_items: [
        { description: 'Item 1', quantity: '1', price: 'R$ 50,00' },
        { description: 'Item 2', quantity: '1', price: 'R$ 50,00' },
      ],
      confidence: 0.92,
      extracted_at: now,
    };
  }

  private mockForm(filename: string, now: Date): FormData {
    return {
      document_type: DocumentType.FORM,
      form_fields: [
        { key: 'field1', value: 'value1', confidence: 0.9 },
        { key: 'field2', value: 'value2', confidence: 0.85 },
      ],
      raw_text: 'Mock form content extracted from document',
      confidence: 0.88,
      extracted_at: now,
    };
  }
}

export const mockTextractService = new MockTextractService();
