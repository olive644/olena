# Atendimento e Discord: texto de privacidade proposto

Estado em 26/10/2026: **proposta para aprovação da proprietária. Nada daqui foi aplicado** à
política publicada (`public/politica-de-privacidade.html`) nem ao aplicativo.

## Por que ainda não está aplicado

- A política vigente (versão 2026-10-19) não menciona o chat de atendimento, que já guarda as
  mensagens na conta da pessoa por até 30 dias. `docs/SUPPORT_SECURITY.md` já exige corrigir isso
  antes de publicar o atendimento.
- Descrever o envio ao Discord antes de ele existir tornaria a política inexata. O texto abaixo
  entra **no mesmo lançamento** que ativa o envio, com uma única troca de versão
  (`PRIVACY_POLICY_VERSION` e `data-policy-version`), para o novo aceite acontecer uma vez só.
- Texto jurídico: esta redação não foi revisada por advogado. Recomenda-se revisão antes de
  publicar, como já ocorre com os Termos de Uso, que seguem rascunho.

## Decisões que dependem da proprietária

Padrão assumido na redação, ajustar se discordar:

1. **Retenção no Discord:** 30 dias depois da última mensagem, igual ao aplicativo.
2. **Quem acessa:** só pessoas da equipe listadas por ID, em canal privado.
3. **Aviso antes da primeira mensagem:** a mensagem só vai ao Discord depois de a pessoa
   confirmar o aviso na tela do atendimento.
4. **Como o prazo é cumprido:** a promessa de apagar a cópia do Discord em 30 dias só pode entrar
   no texto se existir um processo que apague. Recomendado: limpeza automática dentro da limpeza
   diária que já roda (`api/room-cleanup`), que apaga a conversa do Discord e a do banco, e
   também ao excluir a conta. Sem isso, trocar a frase por "a equipe apaga manualmente".
5. **Expiração no banco:** hoje a expiração de 30 dias é lógica (o dado vencido some da leitura,
   mas só é apagado quando alguém o lê). O mesmo processo de limpeza deve apagar de fato.

## Alterações propostas na política

### Resumo (nova linha)

> Se você conversa com o atendimento, o texto da sua mensagem é guardado na sua conta por até
> 30 dias e enviado a um canal privado da nossa equipe no Discord, só depois de você confirmar o
> aviso na tela.

### Seção 2, nova linha da tabela

| Coluna                 | Texto                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Situação               | Conversa com o atendimento                                                                                                                                                                                                                                                                                                                                                                                                                |
| O que usamos           | O texto das mensagens que você escreve (até 2.000 caracteres cada, até 100 por conversa), as respostas da equipe e a data e a hora de cada uma, mais um código embaralhado da conversa que não mostra seu nome nem seu e-mail. Não enviamos ao Discord seu nome, e-mail, o código da sua conta, seus estudos nem seus cadernos. O texto livre pode conter o que você escrever, então evite informar dados que você não quer compartilhar. |
| Para quê               | Responder às suas dúvidas e problemas. Depois que você confirma o aviso, o texto também é enviado a um canal privado da equipe no Discord para ela receber e responder.                                                                                                                                                                                                                                                                   |
| Por que podemos (LGPD) | Para prestar o serviço que você pediu (art. 7º, V). O envio ao Discord só começa depois do seu aviso confirmado (art. 7º, I), que você pode retirar parando de usar o atendimento.                                                                                                                                                                                                                                                        |

### Seção 4, nova linha da lista

> **Discord:** para a nossa equipe receber e responder as conversas do atendimento em um canal
> privado. São enviados só o texto da conversa e um código embaralhado dela. O Discord pode
> tratar dados em outros países, e seguimos a regra da LGPD para envio ao exterior (art. 33).

### Seção 5, novos itens

> **Conversa com o atendimento no aplicativo:** até 30 dias depois da última mensagem.
>
> **Cópia da conversa no Discord:** até 30 dias depois da última mensagem. Se você excluir a
> conta, apagamos a conversa do aplicativo e a cópia no Discord.

(Só publicar estes dois itens quando o processo de limpeza da decisão 4 existir.)

### Seção 8, em "como exercer"

> Para apagar a conversa antes do prazo, peça pelo canal de contato da seção 1. Apagamos no
> aplicativo e na cópia do Discord.

## Aviso na tela do atendimento

Mostrado antes da primeira mensagem de cada pessoa, com o aceite guardado só neste aparelho
(como o da política). A mensagem não é enviada ao Discord antes do aceite.

> **Sua mensagem vai para a equipe.** Ela fica guardada na sua conta por até 30 dias e também é
> enviada, só como texto, a um canal privado da equipe no Discord, que pode tratar dados em outros
> países. Não escreva senhas nem dados que você não quer compartilhar. Veja a Política de
> Privacidade.
>
> [Entendi e quero enviar] [Cancelar]

Se a pessoa cancelar, a mensagem nem fica guardada. Texto do aviso e rótulos entram nos
catálogos de idiomas, em português e inglês.

## Checklist para ativar

- [ ] Proprietária aprova ou ajusta as decisões e o texto.
- [ ] Processo de limpeza (decisão 4) implementado e testado, inclusive exclusão de conta.
- [ ] Fluxo de tickets implementado: envio só depois do aceite, fila de envio atômica, limites.
- [ ] Teto global de execuções e limite por origem no endpoint de interações.
- [ ] Política atualizada e versão trocada na mesma publicação (teste de versão confere).
- [ ] Revisão jurídica do texto.
- [ ] Ensaio no servidor de testes antes dos usuários.
