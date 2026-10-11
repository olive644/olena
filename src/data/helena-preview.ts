// These local examples belong only to the preview, never the application fallback.
export function demonstrationReply(text: string) {
  if (/organizar|agenda|rotina|estudos/i.test(text))
    return "Vamos por partes. Qual matéria você quer estudar e quanto tempo tem hoje? Podemos começar com um bloco curto e deixar uma pausa entre as atividades.";
  if (/revisar|revisão|materia|matéria/i.test(text))
    return "Uma revisão curta pode ajudar bastante. Me diga a matéria e o assunto. A ideia é relembrar o essencial e depois praticar com uma pergunta por vez.";
  if (/matem|conta|equação/i.test(text))
    return "Pode me mostrar a conta ou dizer onde você travou. Vamos separar o problema em passos pequenos, para você entender o caminho, não só o resultado.";
  return "Pode me contar um pouco mais? Diga o assunto e o que está difícil. Vamos começar pelo primeiro passo, no seu ritmo.";
}
