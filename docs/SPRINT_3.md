# Enterprise Challenge - Sprint 3 - YOUVISA

## CHALLENGE YOUVISA

Olá, turma.

Nessa Sprint, o projeto YOUVISA entra em uma fase de maturidade operacional, evoluindo de um sistema focado em recebimento e automação de documentos para uma plataforma inteligente de acompanhamento de processos. O objetivo agora é garantir que clientes e equipe interna tenham visibilidade clara, contínua e confiável sobre o andamento das solicitações de visto.

Vamos nos concentrar na capacidade do sistema de monitorar mudanças de status, explicar etapas do processo em linguagem simples e enviar atualizações proativas, reduzindo incertezas, retrabalho e a necessidade de atendimentos manuais repetitivos. A plataforma deixa de ser apenas reativa e passa a atuar como um agente ativo de comunicação, orientando o cliente ao longo de toda a jornada.

## CONTEXTO

Após a Sprint 1 (planejamento e arquitetura) e a Sprint 2 (documentos e tarefas inteligentes), teoricamente, a sua proposta de solução da YOUVISA já possui um pipeline capaz de receber documentos, classificá-los e gerar tarefas automáticas.

A Sprint 3 aproveita essa base para estruturar o acompanhamento do ciclo de vida do processo, conectando eventos internos a comunicações claras e governadas, especialmente, serviços de mensageria para conectar etapas e informar qual ponto do processo os pedidos de vistos se encontram.

Ou seja, o sistema deve permitir que o cliente consulte o status de sua solicitação a qualquer momento, receba notificações automáticas sempre que houver alterações relevantes e compreenda exatamente em qual etapa se encontra, quais são os próximos passos e quais prazos estão envolvidos.

Paralelamente, o time interno passa a ter maior visibilidade sobre prazos, gargalos e estados críticos dos processos.

## OBJETIVOS

- Permitir que o cliente consulte o andamento do processo por meio do chatbot ou interface da plataforma, utilizando fluxos conversacionais capazes de interpretar diferentes intenções de consulta;
- Implementar atualizações automáticas de status, disparadas sempre que ocorrerem mudanças relevantes no pipeline, a partir de eventos internos previamente definidos;
- Conectar estados internos do processo a notificações inteligentes (e-mail, mensagem ou alerta no sistema), garantindo comunicação consistente e rastreável;
- Utilizar IA Generativa para explicar as etapas do processo em linguagem simples e acessível, traduzindo estados técnicos em mensagens compreensíveis ao usuário final;
- Treinar o chatbot para compreender diferentes formas de perguntas sobre status e prazos, mantendo contexto e coerência ao longo da conversa;
- Oferecer visibilidade de prazos e estados para o time interno, apoiando acompanhamento, priorização e tomada de decisão;
- Aplicar princípios de governança de IA estabelecendo limites claros para respostas automatizadas e protegendo contra comunicações indevidas ou sensíveis.

## REQUISITOS TÉCNICOS E FUNCIONAIS

Para esta sprint, a equipe deverá apresentar uma solução funcional que contemple:

- Um mecanismo de status de processo, com estados bem definidos (exemplo: recebido, em análise, pendente, aprovado, finalizado), implementado como uma máquina de estados finitos, com persistência em banco relacional ou não relacional e controle explícito de transições válidas;
- Chatbot capaz de responder perguntas como “qual o status do meu processo?”, “está faltando algum documento?” ou “qual o próximo passo?” ou “o que preciso fazer?”, utilizando classificação de intenções, entidades contextuais e armazenamento de contexto da conversa para evitar respostas desconexas;
- Integração entre o pipeline interno e um sistema de notificações automáticas, baseada em eventos de mudança de estado (event-driven), com disparo de e-mails ou mensagens a partir de regras condicionais;
- Uso de IA Generativa para traduzir estados técnicos em mensagens claras e compreensíveis para o cliente, empregando prompts estruturados, exemplos controlados e limitação explícita do escopo de resposta;
- Interface (web ou mobile) que apresente o status de forma objetiva, utilizando componentes de progresso, linhas do tempo ou cartões de estado, sincronizados com a API de status;
- Extração de informações relevantes de documentos padronizados para apoiar decisões de status, utilizando leitura automática de campos conhecidos, validações sintáticas e checagens de consistência;
- Registro e controle das transições de estado, garantindo rastreabilidade por meio de logs estruturados, versionamento de eventos e histórico auditável;
- Implementação de guard rails de governança, com regras determinísticas e mensagens pré-aprovadas que impeçam a IA de inferir prazos, aprovações finais ou decisões institucionais.

## ENTREGÁVEIS

Para esta Sprint 3, os grupos deverão entregar:

- Repositório GitHub privado contendo o código atualizado do projeto;
- README.md com explicação do fluxo de status, eventos e notificações;
- Diagrama do fluxo de estados do processo, evidenciando transições e gatilhos;
- Demonstração funcional (vídeo ou gravação de tela de até 4 minutos) mostrando:
  - Consulta de status pelo cliente;
  - Atualização automática de status;
  - Notificação disparada após mudança;
  - O vídeo deve ser postado no YouTube como “não listado” e o link deve ser inserido no seu GitHub privado.
- Relatório técnico resumido (de 1 a 2 páginas) descrevendo as decisões de arquitetura, lógica de status e aplicação de governança.
