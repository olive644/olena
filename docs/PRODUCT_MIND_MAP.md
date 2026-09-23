# Mapa mental do OlenaStudy

Este mapa registra a visão do produto sem afirmar que recursos planejados já estão disponíveis. O
estado executável de cada módulo fica tipado em `src/product/module-catalog.ts`.

```mermaid
mindmap
  root((OlenaStudy))
    Espaço do aluno
      Prioridades do dia
      Progresso
      Ações rápidas
      Busca global
    Planejamento
      Agenda personalizada
      Cronograma de estudos
      Planner semanal
      Checklists
      Hábitos
      Planos de aula
      Banco de atividades
    Foco
      Cronômetro
      Relógio flip
      Sessões registradas
      Redução de distrações
    Conteúdo
      Biblioteca
      Documentos
      Notas rápidas
      Digitalização local
      OCR planejado
      Mapas conectados
    Aprendizagem
      Flashcards
      Repetição espaçada
      Quizzes
      Bingo de revisão
      Cultura e repertório
    Avaliação
      Vestibulares
      Banco de questões
      Simulados
      Caderno de erros
      Desempenho
    Helena inteligente
      Fontes selecionadas
      Resumos
      Explicações
      Planos de estudo
      Consentimento
    Comunidade futura
      Materiais autorais
      Moderação
      Denúncias
      Direitos autorais
```

## Princípio de integração

Os módulos não serão aplicativos isolados dentro do aplicativo. Matérias, fontes, tarefas,
sessões, documentos, questões e revisões devem compartilhar o mesmo workspace. Uma questão errada
pode criar uma revisão; uma revisão pode entrar no planner; uma fonte pode alimentar uma anotação,
um quiz ou um mapa de conteúdo; uma sessão de foco pode registrar progresso na mesma meta.

```mermaid
flowchart TD
  A["Fontes e matérias"] --> B["Workspace compartilhado"]
  B --> C["Planejar"]
  B --> D["Estudar"]
  B --> E["Revisar"]
  C --> F["Progresso"]
  D --> F
  E --> F
```

## Estados

- **Disponível:** existe fluxo funcional, persistência local e testes.
- **Fundação:** existe contrato técnico ou domínio, mas não uma promessa ativa na interface.
- **Planejado:** consta no mapa e no roadmap, sem botão que simule funcionalidade.

O catálogo de produto é a referência para os estados. A documentação detalha intenção; a interface
só oferece ações que funcionam.
