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
computer=computador
hello=olá
goodbye=tchau|adeus
please=por favor
thanks=obrigado|obrigada
yes=sim
no=não
morning=manhã
night=noite
today=hoje
tomorrow=amanhã
cat=gato|gata
dog=cachorro|cachorra|cão
bird=pássaro|ave
fish=peixe
horse=cavalo
cow=vaca
lion=leão
bear=urso
fox=raposa
butterfly=borboleta
red=vermelho|vermelha
blue=azul
green=verde
yellow=amarelo|amarela
black=preto|preta
white=branco|branca
pink=rosa
purple=roxo|roxa
brown=marrom
gray=cinza
one=um|uma
two=dois|duas
three=três
four=quatro
five=cinco
six=seis
seven=sete
eight=oito
nine=nove
ten=dez
happy=feliz
sad=triste
big=grande
small=pequeno|pequena
fast=rápido|rápida
slow=lento|lenta
hot=quente
cold=frio|fria
new=novo|nova
old=velho|velha|antigo|antiga`;

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

export function searchReadyListeningWords(query: string): readonly ListeningCard[] {
  const normalized = query
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return READY_LISTENING_DECK;
  return READY_LISTENING_DECK.filter((card) =>
    [card.front, card.back, ...(card.acceptedAnswers ?? [])].some((value) =>
      value
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(normalized),
    ),
  );
}

export function validReadyListeningWordIds(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length <= READY_LISTENING_DECK.length &&
    ids.every((id) => typeof id === "string" && READY_WORD_IDS.has(id)) &&
    new Set(ids).size === ids.length
  );
}

export function readyListeningAudioUrl(id: string): string | undefined {
  return READY_WORD_IDS.has(id) ? `/audio/kokoro/${id}.mp3` : undefined;
}
