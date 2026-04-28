---
tags:
  - learning
  - concept
related: []
created: 2026-04-26
---
# Sprint 2 dropped OCR (Textract) in favor of Validation + Classifier

The Sprint 1 proposal advertised AWS Textract + Comprehend for full document data extraction. Mid-Sprint 2, the OCR pipeline was removed and replaced with two narrower services: `app/validation/` (OpenCV image-quality checks) and `app/classifier/` (Bedrock Claude 3 Haiku Vision for type classification only). The platform therefore classifies documents into Passaporte / RG / Comprovante / Formulário / Documento inválido — but **does not extract structured fields** (passport number, name, expiry date, etc.).

## Context

Discovered while mapping the actual capability set for Sprint 4 design. README.md and the academic Sprint 1 proposal still describe an "OCR Service" prominently, which leads to assumptions that don't match reality. Removal commit: `6335fc7` ("refactor: remove Textract and Classifier services").

## How It Works

- `app/validation/src/validator.py` — OpenCV checks: format valid, dimensions ≥ 400×400, blur score ≥ 100, brightness 40-220.
- `app/classifier/src/handler.py` — Bedrock prompt: *"classify this image as Passaporte | RG | Comprovante | Formulário | Documento inválido"*. Result is written to `files.document_type` with a confidence score.
- No structured-extraction module exists anywhere in `app/`.
- The original `app/ocr/` directory was deleted; do not look for it.

## How to Apply

When a sprint asks for document **data** (read passport number, autofill a form, validate consistency between two documents), do not assume OCR exists. Either build it explicitly (Textract is now an option that was previously rejected — revisit the rejection reasons before reintroducing) or clarify the requirement down to "type classification only". Treat any "OCR" mention in older docs as out-of-date.
