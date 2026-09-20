# Próximas mecânicas da escrita à mão

O estúdio atual prioriza escrita local, continuidade da edição e navegação segura no papel. O
modo Só caneta evita marcas de dedo durante a escrita com stylus, mas não promete rejeição de palma
por geometria ou postura. Os eventos coalescidos melhoram a fidelidade em movimentos rápidos
quando o navegador oferece a API. O fallback continua sendo o evento de ponteiro normal.

## Próximos incrementos recomendados

1. **Seleção de traços:** laço ou retângulo para mover, redimensionar e alinhar trechos já escritos.
   A seleção deve operar sobre os traços vetoriais, nunca inferir texto de uma imagem antiga.
2. **Janela de escrita ampliada:** região de zoom para letra pequena, com avanço automático ao
   atingir a borda e retorno para a próxima linha pautada. Exige cuidado especial com acessibilidade.
3. **Proteção de escrita em andamento:** salvamento de rascunho ou confirmação antes de descartar
   traços ao fechar. O armazenamento local precisa tratar quota esgotada sem perda silenciosa.
4. **Mais de uma página manuscrita por sessão:** navegação e ordenação de páginas dentro do caderno,
   preservando o vínculo com as folhas atuais do workspace.
5. **Exportação portátil:** PDF ou imagem em resolução escolhida pela pessoa, com indicação clara
   de que o resultado exportado não preserva a edição vetorial.

O reconhecimento de caligrafia e a conversão para texto são trabalhos separados. Não devem ser
apresentados como parte do ajuste local de traço nem enviar conteúdo para serviços externos sem
consentimento e modelo de ameaça.

## Referências de produto e plataforma

- [Pointer Events nível 3, W3C](https://www.w3.org/TR/pointerevents3/): eventos coalescidos,
  pressão, captura e `touch-action` para caneta e toque.
- [Zoom Window, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353756826383-Write-with-the-Zoom-Window): janela de escrita ampliada e avanço automático.
- [Seleção e edição por laço, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353695644175-Select-Move-and-Edit-Content-With-the-Lasso-Tool): seleção e alinhamento de conteúdo manuscrito.
- [Rejeição de palma, Goodnotes](https://support.goodnotes.com/hc/en-us/articles/7353727026959-Configure-palm-rejection-for-comfortable-writing): diferença entre caneta ativa e toques acidentais.
