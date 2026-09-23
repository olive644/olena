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
Quem recebe o link pode copiar a imagem ou encaminhar o link. Não há revogação antecipada
nesta versão. A API recusa tokens vencidos mesmo antes da limpeza programada.

## Proteções e implantação

- Apenas POST, mesma origem quando o cabeçalho Origin estiver presente.
- App Check segue a configuração existente do servidor.
- Criação limitada a seis links por minuto por endereço, leitura a 90.
- Até 40 imagens e corpo de criação limitado a quatro milhões de caracteres.
- Somente data URLs de PNG, JPEG ou WebP; SVG e conteúdo ativo são recusados.
- Títulos são renderizados como texto React e respostas têm Cache-Control no-store.
- `notebook-views` e `notebook-collab` não permitem leitura/escrita direta pelo cliente.
- Publicar índices `expiresAt` em `firebase-room.rules.json` para limpeza programada.

## Verificação

Testes cobrem token de leitura sem poder de edição, recusa de SVG, limite de criação,
entrada do segundo participante usando o código real e conciliação de alterações
simultâneas em objetos distintos. O navegador verifica salvamento sem clique manual,
criação do link e abertura da imagem sem controles de edição. A configuração de
produção exige validação com uma conta real e dois dispositivos; testes em memória
não substituem essa verificação.
