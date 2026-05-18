/**
 * Document Intelligence Module
 * 
 * High-performance modular architecture for document classification, text extraction,
 * deep parsing, normalization, timeline generation and automated database provisioning.
 */

// 1. Core types
export * from './types';

// 2. Classifiers
export { DocumentClassifierService } from './classifiers/DocumentClassifierService';

// 3. Extractors
export { PdfExtractor } from './extractors/PdfExtractor';
export { ImageOcrExtractor } from './extractors/ImageOcrExtractor';

// 4. Parsers
export * from './parsers';

// 5. Normalizers
export { DocumentNormalizer } from './normalizers/DocumentNormalizer';

// 6. Timeline
export { TimelineGenerator } from './timeline/TimelineGenerator';

// 7. Engine orchestrator
export { DocumentIntelligenceEngine } from './engine/DocumentIntelligenceEngine';
export type { ProcessedDocumentResult } from './engine/DocumentIntelligenceEngine';

// Backward compatibility imports/exports
export { TransferParserService } from './TransferParserService';
export type { NormalizedTransfer } from './TransferParserService';
