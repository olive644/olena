# Revisão de conquistas e ofensiva de Inglês

Fixtures sintéticas de visitante, sem dados de conta real. Desktop 1280 por 720; celular Chromium em 320 por 568, com escala do dispositivo. Temas claro e escuro. A galeria usa histórico obtido com data conhecida; a ofensiva usa dois dias consecutivos de recibos ingleses aceitos.

| Tema e dispositivo | Galeria                                      | Olena no nível máximo                        | Perfil                                            | Sino                                                  |
| ------------------ | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Claro, desktop     | [Galeria](desktop-english-gallery-light.png) | [Olena 100](desktop-english-olena-light.png) | [Perfil](desktop-english-streak-light-perfil.png) | [Sino](desktop-english-streak-light-notificacoes.png) |
| Escuro, desktop    | [Galeria](desktop-english-gallery-dark.png)  | [Olena 100](desktop-english-olena-dark.png)  | [Perfil](desktop-english-streak-dark-perfil.png)  | [Sino](desktop-english-streak-dark-notificacoes.png)  |
| Claro, celular     | [Galeria](mobile-english-gallery-light.png)  | [Olena 100](mobile-english-olena-light.png)  | [Perfil](mobile-english-streak-light-perfil.png)  | [Sino](mobile-english-streak-light-notificacoes.png)  |
| Escuro, celular    | [Galeria](mobile-english-gallery-dark.png)   | [Olena 100](mobile-english-olena-dark.png)   | [Perfil](mobile-english-streak-dark-perfil.png)   | [Sino](mobile-english-streak-dark-notificacoes.png)   |

As etapas intermediárias usam cenas sem personagem; a confirmação final preserva a arte existente da Olena. O objetivo de confirmação aparece em 100, após as etapas 25 e 50. A troca de etapa mantém a inspeção e os controles compartilhados de Matemática.

As provas verificam navegação por teclado, inspeção, troca de nível, PNG de 1080 por 1350, ausência de rolagem horizontal e recarga da ofensiva. Redução de movimento e brilho das conquistas matemáticas e gerais continuam nos testes de regressão. Sem validação em aparelho físico, Safari ou sincronização com conta real; persistência pública e bloqueio são verificados em testes da API.

## Feed inglês

Preview isolado dos componentes reais de atividade, sem autenticação nem requisição de publicação. Exibe prática inglesa, confirmação do Arquivo das Entrelinhas, conquista inglesa e prática matemática no mesmo conjunto de cards. A integração de publicação e privacidade é exercitada nos testes da API; estas capturas verificam apresentação.

| Dispositivo    | Claro                                        | Escuro                                       |
| -------------- | -------------------------------------------- | -------------------------------------------- |
| Desktop        | [Feed claro](desktop-english-feed-light.png) | [Feed escuro](desktop-english-feed-dark.png) |
| Celular 320 px | [Feed claro](mobile-english-feed-light.png)  | [Feed escuro](mobile-english-feed-dark.png)  |

Reprodução: iniciar npm run dev na porta 4174 e executar node artifacts/english-achievements-review/capture-feed.mjs. O preview não conecta conta nem envia atividades.

## Etapa intermediária sem personagem

| Dispositivo | Claro                                              | Escuro                                            |
| ----------- | -------------------------------------------------- | ------------------------------------------------- |
| Desktop     | [Nível 25](desktop-english-intermediate-light.png) | [Nível 25](desktop-english-intermediate-dark.png) |
| Celular     | [Nível 25](mobile-english-intermediate-light.png)  | [Nível 25](mobile-english-intermediate-dark.png)  |

A inspeção permite alternar 25, 50 e 100. A imagem com Olena permanece no nível 100, com os mesmos IDs e datas históricos.
