# Primeira rodada de treinamento matemático v2

Executada em 2026-10-12, na branch fix/olena-training-quality. [Execução real](https://github.com/olive644/olena/actions/runs/38301378409), commit 014c5225f31390773ec70e23c3c38a3fb8734bb4. Código de dados, treino e avaliação coincide com a PR; a proteção adicional de renovação dos últimos pesos aprovados foi acrescentada depois e tem teste próprio.

Treino: 96 exemplos originais, 96 passos CPU, Qwen2.5-0.5B-Instruct, LoRA rank 4. Avaliação: 32 questões separadas do treino. Resultado global da base: 2/32 (6,25%). Resultado candidato: 22/32 (68,75%). Loss do primeiro passo: 4,4364; último: 1,0994. A loss não define aprovação.

A métrica exige valor exato e resposta completa no formato curto solicitado. Algumas respostas da base continham contas corretas, mas acompanhadas de texto ou igualdade, e por isso foram rejeitadas pelo avaliador. Portanto o ganho de 2 para 22 inclui melhora de formato e não deve ser apresentado como medida isolada de habilidade matemática. O relatório preserva todas as respostas para inspeção. Os erros de frações e equações do candidato foram valores incorretos, mesmo no formato pedido.

| Tema              | Base | Candidato |
| ----------------- | ---- | --------- |
| Adição            | 0/4  | 3/4       |
| Subtração         | 0/4  | 4/4       |
| Multiplicação     | 0/4  | 4/4       |
| Divisão           | 1/4  | 3/4       |
| Frações           | 1/4  | 0/4       |
| Porcentagens      | 0/4  | 4/4       |
| Equações lineares | 0/4  | 0/4       |
| Potências         | 0/4  | 4/4       |

O candidato foi rejeitado. Não atingiu 24/32, ficou abaixo de 2/4 em frações e equações e perdeu um acerto anterior em frações. Os erros dessas duas categorias foram respostas matemáticas incorretas, não somente erro de formato. Nenhum peso rejeitado foi enviado ao artefato de candidato, e nenhum modelo foi promovido ao chat. O workflow terminou com sucesso porque executou e registrou a rejeição de qualidade corretamente.

O resultado mostra melhora nessa pequena avaliação de respostas curtas, não qualidade geral de tutoria. O próximo corpus deve ampliar métodos e variedade de frações e equações, sem copiar as perguntas avaliadas. Novas decisões orientadas por esse benchmark exigem uma avaliação final independente para evitar otimização apenas para as mesmas 32 perguntas. Avaliação humana de explicações ainda é necessária.

O [relatório completo](experiments/olena-math-v2-2026-10-12.json) contém respostas, regressões, versão, hashes e cobertura do treinamento, todos de exemplos sintéticos públicos.
