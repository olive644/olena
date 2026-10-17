# API de conclusão do perfil

GET /api/olena?action=profile-completion&version=1 usa o ID token Firebase da
conta, a lista de origens já existente e a cota de 30 consultas por minuto por
UID. Não aceita UID, nome de usuário, campos de perfil nem outra pessoa como
parâmetro. Resposta no-store: version, steps (id/done), completed, complete e next.
Não usa IA, não altera dados e não concede XP.

O servidor lê somente helena.profile.v1 no stateV2 da conta autenticada e o
username registrado no índice privado dessa conta. Não baixa cadernos, estudos,
feed social ou o registro de outras pessoas. A sincronização existente migra
contas antigas antes da apresentação estar pronta. Falhas retornam 503, nunca
um perfil vazio que finja ser uma validação bem-sucedida.

## Modelo de ameaça

- IDOR: o UID vem exclusivamente do token verificado, sem parâmetro de seleção.
- Conta removida/desativada e sessão anônima: verificador existente consulta a
  validade atual da conta; anônimos não podem consultar.
- Privilégios locais falsos: username vem da reserva do servidor, nunca do cache.
- Dados malformados: nome não vazio até 60 caracteres, avatar/capa nas listas
  aprovadas. Pronomes, bio e redes são opcionais.
- Exfiltração: resposta contém apenas etapas booleanas, sem campos pessoais.
- Origem e abuso: allowlist existente, GET somente, parâmetros estritos, cota,
  timeout de leitura e erros genéricos. Nenhuma regra Firebase foi relaxada.
- Respostas antigas: cliente confirma o mesmo UID após a rede e descarta efeitos
  desmontados ou cuja chave de campos mudou. Cache é memória por UID e chave,
  por até 15 segundos, sem guardar token.

## Interface e sincronização

O card calcula imediatamente as etapas com a mesma regra pura, enquanto a API
confere os valores realmente persistidos. Perfil preenchido celebra as escolhas,
sem repetir cobranças enquanto a conferência remota ocorre em segundo plano.
A celebração não é um recibo de sincronização. A identidade ainda desconhecida
usa uma mensagem neutra, sem pedir novamente Nome/@. Edição ainda em sincronização
não regride a etapa: há até quatro tentativas espaçadas. Foco, recuperação da rede
e mudança de estado da sincronização permitem nova conferência, inclusive após
um envio demorado. O status de sincronização da conta continua separado.
Não existe armazenamento separado de conclusão que possa contradizer os campos.

A integração é entregue em PR própria sobre a PR visual, conforme a regra de
separar leituras autenticadas e armazenamento remoto das mudanças de design.
