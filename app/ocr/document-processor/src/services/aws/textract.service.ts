import {
  TextractClient,
  AnalyzeIDCommand,
  AnalyzeExpenseCommand,
  AnalyzeDocumentCommand,
  FeatureType,
} from '@aws-sdk/client-textract';
import { env, logger } from '../../config';
import {
  DocumentType,
  PassportData,
  IDCardData,
  ReceiptData,
  FormData,
  ExtractionResult,
} from '../../types';

export class TextractService {
  private textractClient: TextractClient;

  constructor() {
    const region = env.AWS_REGION;
    logger.info('Initializing TextractClient', {
      region,
      endpoint: `https://textract.${region}.amazonaws.com`,
      allEnv: {
        AWS_REGION: process.env.AWS_REGION,
        NODE_ENV: process.env.NODE_ENV
      }
    });
    this.textractClient = new TextractClient({
      region,
      endpoint: `https://textract.${region}.amazonaws.com`,
      maxAttempts: 3,
      requestHandler: {
        requestTimeout: 60000
      }
    });
  }

  async analyzeDocument(bucket: string, key: string, docType: DocumentType): Promise<ExtractionResult> {
    logger.info('AWS Textract - analyzing document', { bucket, key, docType });

    switch (docType) {
      case DocumentType.PASSPORT:
      case DocumentType.ID_CARD:
      case DocumentType.DRIVERS_LICENSE:
        return this.analyzeID(bucket, key, docType);

      case DocumentType.RECEIPT:
      case DocumentType.INVOICE:
        return this.analyzeExpense(bucket, key, docType);

      case DocumentType.FORM:
        return this.analyzeForm(bucket, key);

      default:
        return this.analyzeGeneric(bucket, key);
    }
  }

  private async analyzeID(bucket: string, key: string, docType: DocumentType): Promise<PassportData | IDCardData> {
    try {
      const command = new AnalyzeIDCommand({
        DocumentPages: [
          {
            S3Object: {
              Bucket: bucket,
              Name: key,
            },
          },
        ],
      });

      const response = await this.textractClient.send(command);

      if (!response.IdentityDocuments || response.IdentityDocuments.length === 0) {
        throw new Error('No identity document detected');
      }

      const identityDoc = response.IdentityDocuments[0];
      const fields = identityDoc.IdentityDocumentFields || [];

      const getFieldValue = (type: string): string | undefined => {
        const field = fields.find((f) => f.Type?.Text === type);
        return field?.ValueDetection?.Text;
      };

      const averageConfidence =
        fields.reduce((sum, field) => sum + (field.ValueDetection?.Confidence || 0), 0) / fields.length || 0;

      const now = new Date();

      if (docType === DocumentType.PASSPORT) {
        return {
          document_type: DocumentType.PASSPORT,
          document_number: getFieldValue('DOCUMENT_NUMBER') || '',
          full_name: getFieldValue('FULL_NAME') || getFieldValue('FIRST_NAME') + ' ' + getFieldValue('LAST_NAME') || '',
          birth_date: getFieldValue('DATE_OF_BIRTH') || '',
          expiry_date: getFieldValue('EXPIRATION_DATE') || '',
          nationality: getFieldValue('NATIONALITY') || '',
          issuing_country: getFieldValue('ISSUING_COUNTRY') || getFieldValue('COUNTRY') || '',
          sex: getFieldValue('SEX') || '',
          place_of_birth: getFieldValue('PLACE_OF_BIRTH') || '',
          confidence: averageConfidence / 100,
          extracted_at: now,
        };
      } else {
        return {
          document_type: DocumentType.ID_CARD,
          document_number: getFieldValue('DOCUMENT_NUMBER') || '',
          full_name: getFieldValue('FULL_NAME') || getFieldValue('FIRST_NAME') + ' ' + getFieldValue('LAST_NAME') || '',
          birth_date: getFieldValue('DATE_OF_BIRTH') || '',
          issuing_date: getFieldValue('ISSUE_DATE') || '',
          issuing_authority: getFieldValue('ISSUING_AUTHORITY') || '',
          cpf: getFieldValue('ID_NUMBER') || '',
          confidence: averageConfidence / 100,
          extracted_at: now,
        };
      }
    } catch (error) {
      logger.error('Error analyzing ID document with Textract', { error, bucket, key });
      throw error;
    }
  }

  private async analyzeExpense(
    bucket: string,
    key: string,
    docType: DocumentType.RECEIPT | DocumentType.INVOICE
  ): Promise<ReceiptData> {
    try {
      const command = new AnalyzeExpenseCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
      });

      const response = await this.textractClient.send(command);

      if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
        throw new Error('No expense document detected');
      }

      const expenseDoc = response.ExpenseDocuments[0];
      const summaryFields = expenseDoc.SummaryFields || [];
      const lineItems = expenseDoc.LineItemGroups?.[0]?.LineItems || [];

      const getSummaryValue = (type: string): string => {
        const field = summaryFields.find((f) => f.Type?.Text === type);
        return field?.ValueDetection?.Text || '';
      };

      const totalConfidence =
        summaryFields.reduce((sum, field) => sum + (field.ValueDetection?.Confidence || 0), 0) /
          summaryFields.length || 0;

      return {
        document_type: docType,
        vendor_name: getSummaryValue('VENDOR_NAME') || getSummaryValue('NAME') || '',
        total_amount: getSummaryValue('TOTAL') || getSummaryValue('AMOUNT_PAID') || '',
        transaction_date: getSummaryValue('INVOICE_RECEIPT_DATE') || getSummaryValue('DATE') || '',
        tax_amount: getSummaryValue('TAX') || '',
        line_items: lineItems.map((item) => ({
          description: item.LineItemExpenseFields?.find((f) => f.Type?.Text === 'ITEM')?.ValueDetection?.Text || '',
          quantity: item.LineItemExpenseFields?.find((f) => f.Type?.Text === 'QUANTITY')?.ValueDetection?.Text || '',
          price: item.LineItemExpenseFields?.find((f) => f.Type?.Text === 'PRICE')?.ValueDetection?.Text || '',
        })),
        confidence: totalConfidence / 100,
        extracted_at: new Date(),
      };
    } catch (error) {
      logger.error('Error analyzing expense document with Textract', { error, bucket, key });
      throw error;
    }
  }

  private async analyzeForm(bucket: string, key: string): Promise<FormData> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
      });

      const response = await this.textractClient.send(command);
      const blocks = response.Blocks || [];

      const keyValuePairs: { key: string; value: string; confidence: number }[] = [];
      let rawText = '';

      const keyBlocks = blocks.filter((b) => b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes?.includes('KEY'));

      for (const keyBlock of keyBlocks) {
        const keyText = this.getBlockText(blocks, keyBlock.Id || '');
        const valueId = keyBlock.Relationships?.find((r) => r.Type === 'VALUE')?.Ids?.[0];
        const valueText = valueId ? this.getBlockText(blocks, valueId) : '';
        const confidence = keyBlock.Confidence || 0;

        keyValuePairs.push({
          key: keyText,
          value: valueText,
          confidence: confidence / 100,
        });
      }

      const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
      rawText = lineBlocks.map((b) => b.Text || '').join('\n');

      const averageConfidence =
        keyValuePairs.reduce((sum, pair) => sum + pair.confidence, 0) / keyValuePairs.length || 0;

      return {
        document_type: DocumentType.FORM,
        form_fields: keyValuePairs,
        raw_text: rawText,
        confidence: averageConfidence,
        extracted_at: new Date(),
      };
    } catch (error) {
      logger.error('Error analyzing form with Textract', { error, bucket, key });
      throw error;
    }
  }

  private async analyzeGeneric(bucket: string, key: string): Promise<FormData> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        FeatureTypes: [FeatureType.FORMS],
      });

      const response = await this.textractClient.send(command);
      const blocks = response.Blocks || [];

      const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
      const rawText = lineBlocks.map((b) => b.Text || '').join('\n');

      const averageConfidence =
        lineBlocks.reduce((sum, block) => sum + (block.Confidence || 0), 0) / lineBlocks.length || 0;

      return {
        document_type: DocumentType.FORM,
        form_fields: [],
        raw_text: rawText,
        confidence: averageConfidence / 100,
        extracted_at: new Date(),
      };
    } catch (error) {
      logger.error('Error analyzing generic document with Textract', { error, bucket, key });
      throw error;
    }
  }

  private getBlockText(blocks: any[], blockId: string): string {
    const block = blocks.find((b) => b.Id === blockId);
    if (!block) return '';

    if (block.Text) return block.Text;

    const childIds = block.Relationships?.find((r: any) => r.Type === 'CHILD')?.Ids || [];
    return childIds
      .map((id: string) => {
        const childBlock = blocks.find((b) => b.Id === id);
        return childBlock?.Text || '';
      })
      .join(' ');
  }
}

export const textractService = new TextractService();
