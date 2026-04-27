# Diagramas

## Sprint 4 — fonte da verdade: Mermaid no README

A partir da Sprint 4, o diagrama de arquitetura canônico vive como bloco
Mermaid no [README do projeto](../../README.md#arquitetura) — renderiza
inline no GitHub e fica versionado em texto.

## `Diagramas.drawio` (Sprint 3, arquivado)

O arquivo `Diagramas.drawio` e os PNGs `arquitetura_global.png` /
`fluxo_de_comunicacao.png` retratam a arquitetura **da Sprint 3** (com
n8n + Lambdas Bedrock + Mongo Atlas). Foram preservados para fins
históricos / acadêmicos, mas **não refletem o sistema implementado na
Sprint 4** — n8n foi removido, Mongo passou a ser local, o NLP virou
multi-agente em TypeScript com Claude Agent SDK, e o classificador
saiu da Lambda para o agent service.

Para entender a arquitetura **atual**, use o Mermaid no README.
