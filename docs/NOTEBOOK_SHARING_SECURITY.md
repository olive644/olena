# Compartilhamento de folhas: segurança e limites

## Dados e autorização

O salvamento automático grava o documento editável e sua imagem no workspace existente.
A sincronização de conta continua em `users/<uid>/state`, protegida por Firebase Auth e
pelas regras que exigem o mesmo UID. A interface só indica sincronização quando o hook
de conta informa confirmação. Fechar o navegador offline não garante envio à nuvem.

A colaboração é uma sala temporária da folha aberta. Participantes entram com código
de convite e recebem credencial individual. O limite continua sendo quatro pessoas.
Ter o código permite solicitar entrada; não é uma lista de amigos autenticados. A
projeção pública da sala é legível por quem conhece o código enquanto não expirar.
Não compartilhar códigos ou materiais confidenciais com pessoas não autorizadas.

O link de visualização cria uma cópia independente somente após clicar em Criar link.
Seu token UUID aleatório autoriza leitura dessa cópia por sete dias. Não permite editar
o caderno original, não contém credenciais da sala e não acompanha mudanças posteriores.
Quem recebe o link pode copiar a imagem ou encaminhar o link. Quem criou o link pode revogá-lo
antes dos sete dias (ação `view-revoke`, botão "Revogar link"): o token é apagado e a leitura passa
a dar 404 na hora. Só a conta que criou consegue revogar; links criados antes de o dono ser gravado
não têm como provar de quem são e expiram sozinhos. Imagens que alguém já salvou não são desfeitas. A API recusa tokens vencidos mesmo antes da limpeza programada.

Criar o link exige conta autenticada, porque cada link guarda até 4 MB por sete dias no
banco compartilhado. Sem login, a interface orienta a entrar e nada é enviado. A API recusa
contas anônimas, confere a assinatura dos primeiros bytes de cada imagem (um texto que apenas
se declara imagem é recusado) e aplica cota por conta (5 por hora, 10 por dia) e global
(300 por dia). Ler um link continua público para quem tem o token.

## Proteções e implantação

- Apenas POST, mesma origem quando o cabeçalho Origin estiver presente.
- App Check segue a configuração existente do servidor.
- Criação limitada a seis links por minuto por endereço, leitura a 90, revogação a 30.
- Código de convite errado ao entrar: 20 por hora por endereço (depois, 429). O código tem 5
  símbolos de um alfabeto de 32 (cerca de 33,5 milhões de combinações) e a sala some em pouco
  tempo, então o limite encarece a varredura sem atrapalhar quem erra a digitação. Quem controla
  muitos endereços ainda pode tentar; a aprovação do dono antes da entrada seria a defesa mais
  forte e é uma mudança de produto separada.
- Até 40 imagens e corpo de criação limitado a quatro milhões de caracteres.
- Somente data URLs de PNG, JPEG ou WebP; SVG e conteúdo ativo são recusados.
- Títulos são renderizados como texto React e respostas têm Cache-Control no-store.
- `notebook-views` e `notebook-collab` não permitem leitura/escrita direta pelo cliente.
- O cursor ao vivo usa a ação `cursor`, que exige a credencial do participante e grava só `rooms/{identificador}/cursors/{id}` com x e y limitados a 0 a 4000; não guarda nada além da posição e da hora.
- Publicar índices `expiresAt` em `firebase-room.rules.json` para limpeza programada.

## Verificação

Testes cobrem token de leitura sem poder de edição, recusa de SVG, limite de criação,
entrada do segundo participante usando o código real e conciliação de alterações
simultâneas em objetos distintos. O navegador verifica salvamento sem clique manual,
criação do link e abertura da imagem sem controles de edição. A configuração de
produção exige validação com uma conta real e dois dispositivos; testes em memória
não substituem essa verificação.
