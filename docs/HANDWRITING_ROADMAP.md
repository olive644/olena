# Próximas mecânicas da escrita à mão

O estúdio atual prioriza escrita local, continuidade da edição e navegação segura no papel. O
modo Só caneta evita marcas de dedo durante a escrita com stylus, mas não promete rejeição de palma
por geometria ou postura. Os eventos coalescidos melhoram a fidelidade em movimentos rápidos
quando o navegador oferece a API. O fallback continua sendo o evento de ponteiro normal.

## Entregue nesta etapa

- Cadernos compartilhados (primeira etapa): o editor cria ou entra em uma sala por código, com até
  quatro participantes ativos, presença por nome, atividade recente e propagação da folha entre
  abas/dispositivos pelo transporte realtime. A sala é temporária e o servidor valida o documento;
  CRDT por traço fica como evolução futura.

- Rascunho local recuperável e confirmação ao fechar uma folha com alterações.
- Seleção retangular de traços para mover, alinhar horizontalmente e apagar.
- Janela de escrita ampliada com avanço manual e avanço ao atingir a borda direita.
- Navegação e reordenação de folhas do caderno.
- Exportação PNG e impressão com opção de salvar em PDF pelo navegador.
- Post-its editáveis, com três cores e posição livre sobre o papel.
- Painel de camadas com visibilidade persistente para documento importado, coordenadas, escrita,
  texto e post-its.
- Seleção retangular também reconhece sistemas de coordenadas, permitindo mover e apagar os eixos
  junto com outros traços.
- Seleção por laço livre e ações de escala proporcional para traços e sistemas de coordenadas.
- Seleção compartilhada para traços, coordenadas, post-its e texto, com remoção e ajuste de tamanho
  no mesmo fluxo.
- Correção automática local no Texto, com acentos frequentes, capitalização após pontuação e opção
  para desligar o comportamento.
- Importação de todas as páginas de um PDF como folhas separadas, mantendo cada página ajustável e
  anotável individualmente.
- Exportação do caderno inteiro para uma sequência de impressão pronta para salvar como PDF, com uma
  folha por página e margens A4 limpas.
- Post-its com redimensionamento por alça, preservando proporção do texto e compatibilidade com
  folhas antigas.
- Histórico local do workspace no Perfil, com até seis snapshots recentes, deduplicação consecutiva
  e restauração de uma versão anterior sem alterar o protocolo de sincronização na nuvem.
- PDF direto da folha atual, baixado localmente como imagem rasterizada em uma página sem abrir o
  diálogo de impressão; a impressão tradicional continua disponível como alternativa.
- Post-its com modo checklist, itens concluídos, título, inclusão e remoção de itens, mantendo notas
  antigas compatíveis e renderização completa na exportação.
- Post-its com ordenação de camada individual, trazendo para frente ou enviando para trás com estado
  persistido no histórico e nas exportações.
- Leitura matemática local para sistemas de coordenadas, exibindo Δx, Δy, distância, inclinação e
  ângulo durante o gesto e ao selecionar um eixo existente.
- Assistente local de fórmula para um eixo selecionado, com leitura sugerida ou edição manual,
  confirmação explícita e anotação preservando os traços originais.
- OCR local opcional para uma seleção de traços, com Tesseract.js carregado sob demanda, revisão
  da sugestão no campo de fórmula e confirmação explícita antes de inserir a anotação.
- Ordenação persistente de camadas de coordenadas, texto, escrita e post-its, com controles para
  subir ou descer a composição e suporte a desfazer, rascunho e exportação.
- Janela ampliada com acompanhamento automático opcional: avança por coluna e linha ao alcançar a
  borda, oferece controle manual e anuncia a posição atual para tecnologias assistivas.
- Objetos importados independentes: novas imagens entram na mesma folha sem substituir o fundo
  legado, com seleção, movimento, redimensionamento, rotação em passos de 15°, histórico e
  exportação local.
- Sincronização com conciliação local por chave: alterações independentes são combinadas, conflitos
  preservam a versão local e guardam uma cópia remota para recuperação no dispositivo.

## Próximos incrementos recomendados

1. **OCR matemático especializado:** avaliar um provedor com reconhecimento de símbolos manuscritos
   e LaTeX, como integração opcional e consentida, sem colocar credenciais no bundle do navegador.

O reconhecimento de caligrafia e a conversão para texto são trabalhos separados. O OCR local atual
é adequado para texto simples, números e operadores latinos; a saída sempre exige revisão e não
substitui um interpretador matemático. Não devem ser enviados traços para serviços externos sem
consentimento, autenticação segura e modelo de ameaça.

## Referências de produto e plataforma

- [Pointer Events nível 3, W3C](https://www.w3.org/TR/pointerevents3/): eventos coalescidos,
  pressão, captura e `touch-action` para caneta e toque.
- [Zoom Window, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353756826383-Write-with-the-Zoom-Window): janela de escrita ampliada e avanço automático.
- [Seleção e edição por laço, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353695644175-Select-Move-and-Edit-Content-With-the-Lasso-Tool): seleção e alinhamento de conteúdo manuscrito.
- [Rejeição de palma, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353727026959-Configure-palm-rejection-for-comfortable-writing): diferença entre caneta ativa e toques acidentais.
