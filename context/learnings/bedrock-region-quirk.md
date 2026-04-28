---
tags:
  - learning
  - gotcha
related: []
created: 2026-04-26
---
# AWS Bedrock Claude lives in `us-east-1`, not the project's `sa-east-1`

All other AWS resources for YOUVISA (S3, MongoDB connection, etc.) target `sa-east-1` (São Paulo) for LGPD posture. Bedrock calls target `us-east-1` because Anthropic Claude 3 Haiku is not available in the São Paulo region. The override is a separate env var, `BEDROCK_REGION`, distinct from `AWS_REGION`.

## Context

Found while investigating why a fresh `.env` setup was producing model-not-found errors. Easy to miss because both regions look "right" individually.

## How It Works

- `.env.example` line 14-15: `AWS_REGION=sa-east-1` AND `BEDROCK_REGION=us-east-1` — they are intentionally different.
- `app/nlp/src/bedrock.py:17-29` and `app/classifier/src/bedrock.py` create the boto3 client with `Config(region_name=BEDROCK_REGION)`, ignoring the global `AWS_REGION`.
- Terraform IAM policies grant `bedrock:InvokeModel` on the `us-east-1` ARN.
- A missing or blank `BEDROCK_REGION` falls back to `us-east-1` per the Python defaults — but if someone sets it to `sa-east-1` "for consistency", invocation fails with a misleading error.

## How to Apply

- When debugging a Bedrock call, **never** assume `AWS_REGION` is what's used — check `BEDROCK_REGION` explicitly.
- Failure mode is *model-not-found*, not *region-invalid*, which makes it easy to misdiagnose as a permissions or model-id issue.
- Sprint 4 onward uses Claude Agent SDK (Anthropic direct, not Bedrock), so this becomes irrelevant for new code. Existing `app/nlp/` and `app/classifier/` Lambdas still depend on it until they are migrated or deprecated. Do not introduce **new** Bedrock dependencies (per the constitution).
