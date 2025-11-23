export { BaseExtraction } from './base-extraction.types';
export type { PassportData } from './passport.types';
export type { IDCardData } from './id-card.types';
export type { ReceiptData, LineItem } from './receipt.types';
export type { FormData, FormField } from './form.types';

import type { PassportData } from './passport.types';
import type { IDCardData } from './id-card.types';
import type { ReceiptData } from './receipt.types';
import type { FormData } from './form.types';

export type ExtractionResult = PassportData | IDCardData | ReceiptData | FormData;
