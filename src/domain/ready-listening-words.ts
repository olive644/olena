import type { ListeningCard } from "./listening-quiz.js";

export const READY_LISTENING_SOURCE = "Palavras prontas";

// Cada linha identifica um cartao e o MP3 Kokoro correspondente em public/audio/kokoro.
// Traducoes alternativas ficam separadas por |.
const READY_WORD_ROWS = `school=escola
book=livro
teacher=professor|professora
student=aluno|aluna
pencil=lápis
paper=papel
desk=carteira|mesa
classroom=sala de aula
question=pergunta
answer=resposta
mother=mãe
father=pai
sister=irmã
brother=irmão
baby=bebê
friend=amigo|amiga
home=lar
house=casa
child=criança
family=família
sun=sol
moon=lua
star=estrela
sky=céu
rain=chuva
tree=árvore
flower=flor
river=rio
ocean=oceano
mountain=montanha
water=água
bread=pão
milk=leite
apple=maçã
banana=banana
rice=arroz
cheese=queijo
egg=ovo
coffee=café
orange=laranja
car=carro
bus=ônibus|autocarro
train=trem
bicycle=bicicleta
door=porta
window=janela
chair=cadeira
table=mesa
phone=telefone|celular
computer=computador`;

export const READY_LISTENING_DECK: readonly ListeningCard[] = READY_WORD_ROWS.split("\n").map(
  (row) => {
    const [front, translations] = row.split("=") as [string, string];
    const [back, ...acceptedAnswers] = translations.split("|");
    return {
      id: `ready-${front}`,
      front,
      back: back!,
      ...(acceptedAnswers.length ? { acceptedAnswers } : {}),
    };
  },
);

const READY_WORD_IDS = new Set(READY_LISTENING_DECK.map((card) => card.id));

export function readyListeningAudioUrl(id: string): string | undefined {
  return READY_WORD_IDS.has(id) ? `/audio/kokoro/${id}.mp3` : undefined;
}
