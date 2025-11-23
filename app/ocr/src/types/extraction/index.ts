export { BaseExtraction } from './base-extraction.types';
export { PassportData } from './passport.types';
export { IDCardData } from './id-card.types';
export { ReceiptData, type LineItem } from './receipt.types';
export { FormData, type FormField } from './form.types';

export type ExtractionResult =
  | PassportData
  | IDCardData
  | ReceiptData
  | FormData;
