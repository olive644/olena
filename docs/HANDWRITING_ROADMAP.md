# Próximas mecânicas da escrita à mão

O estúdio atual prioriza escrita local, continuidade da edição e navegação segura no papel. O
modo Só caneta evita marcas de dedo durante a escrita com stylus, mas não promete rejeição de palma
por geometria ou postura. Os eventos coalescidos melhoram a fidelidade em movimentos rápidos
quando o navegador oferece a API. O fallback continua sendo o evento de ponteiro normal.

## Entregue nesta etapa

- Rascunho local recuperável e confirmação ao fechar uma folha com alterações.
- Seleção retangular de traços para mover, alinhar horizontalmente e apagar.
- Janela de escrita ampliada com avanço manual e avanço ao atingir a borda direita.
- Navegação e reordenação de folhas do caderno.
- Exportação PNG e impressão com opção de salvar em PDF pelo navegador.
- Post-its editáveis, com três cores e posição livre sobre o papel.

## Próximos incrementos recomendados

1. **Laço livre e redimensionamento:** a seleção atual usa um retângulo. Laço desenhado e escala
   proporcional de traços ficam para uma etapa própria.
2. **Janela ampliada mais automática:** acompanhar a pauta e deslocar a área de escrita conforme a
   caligrafia, com anúncio acessível da posição atual.
3. **Rascunhos entre dispositivos:** exigir sincronização própria, resolução de conflitos e um
   modelo de privacidade antes de oferecer o recurso.
4. **PDF direto e várias folhas:** gerar um arquivo único do caderno, com escolha de resolução e
   margens. Hoje a opção Imprimir/PDF depende do navegador e exporta uma folha por vez.
5. **Post-its avançados:** redimensionar, ordenar camadas e criar modelos de checklist sem perder
   a legibilidade em telas pequenas.

O reconhecimento de caligrafia e a conversão para texto são trabalhos separados. Não devem ser
apresentados como parte do ajuste local de traço nem enviar conteúdo para serviços externos sem
consentimento e modelo de ameaça.

## Referências de produto e plataforma

- [Pointer Events nível 3, W3C](https://www.w3.org/TR/pointerevents3/): eventos coalescidos,
  pressão, captura e `touch-action` para caneta e toque.
- [Zoom Window, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353756826383-Write-with-the-Zoom-Window): janela de escrita ampliada e avanço automático.
- [Seleção e edição por laço, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353695644175-Select-Move-and-Edit-Content-With-the-Lasso-Tool): seleção e alinhamento de conteúdo manuscrito.
- [Rejeição de palma, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353727026959-Configure-palm-rejection-for-comfortable-writing): diferença entre caneta ativa e toques acidentais.
