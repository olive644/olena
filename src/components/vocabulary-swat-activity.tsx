import { Hand, Headphones, Printer, Trophy, Users } from "lucide-react";

const MATERIALS = [
  "Mãos de papel presas em palitos de madeira",
  "Flashcards ou imagens do vocabulário sobre a mesa",
  "Áudio com as palavras-alvo e uma caixa de som",
] as const;

const STEPS = [
  "Divida a turma em equipes de 3 a 4 alunos ao redor de uma mesa com as imagens.",
  "Entregue uma mão-mata-mosca por equipe e inicie o áudio do vocabulário.",
  "Quando ouvirem uma palavra, os alunos devem bater na imagem correspondente.",
  "Dê um ponto para quem acertar primeiro e reveze a mão a cada poucas palavras.",
] as const;

const HAND_TEMPLATES = Array.from({ length: 8 }, (_, index) => index + 1);
const TEAM_LINES = Array.from({ length: 4 }, (_, index) => index + 1);

export function VocabularySwatActivity() {
  return (
    <section className="swat-activity" aria-labelledby="swat-activity-title">
      <header className="swat-activity__header">
        <div>
          <span className="section-label">Atividade pronta · 10-15 min</span>
          <h2 id="swat-activity-title">Mão no vocabulário</h2>
          <p>Escuta, reconhecimento visual e reflexo em uma disputa rápida entre equipes.</p>
        </div>
        <div className="swat-activity__tags" aria-label="Características da atividade">
          <span>
            <Headphones size={16} aria-hidden="true" /> Escuta
          </span>
          <span>
            <Users size={16} aria-hidden="true" /> Equipes de 3-4
          </span>
        </div>
      </header>

      <div className="swat-activity__layout">
        <div className="swat-activity__instructions">
          <div>
            <h3>Objetivo</h3>
            <p>
              Associar rapidamente a palavra ouvida à imagem correta, fortalecendo a compreensão
              oral e a recuperação de vocabulário.
            </p>
          </div>

          <div>
            <h3>Materiais</h3>
            <ul>
              {MATERIALS.map((material) => (
                <li key={material}>{material}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Como jogar</h3>
            <ol>
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <aside className="swat-activity__rule">
            <Trophy size={20} aria-hidden="true" />
            <p>
              <strong>Regra de pontuação:</strong> um ponto para o primeiro acerto. A mão é apenas o
              “mata-mosca”; as respostas são as imagens de vocabulário.
            </p>
          </aside>
        </div>

        <div className="swat-activity__print-area">
          <div className="swat-print-sheet" aria-label="Folha com moldes de mãos para imprimir">
            <header>
              <div>
                <span>OlenaStudy · material de aula</span>
                <h3>Mãos-mata-mosca</h3>
              </div>
              <p>Recorte e cole cada mão em um palito de madeira.</p>
            </header>

            <div className="swat-hand-grid">
              {HAND_TEMPLATES.map((number) => (
                <div role="img" aria-label={`Molde de mão ${number}`} key={number}>
                  <Hand strokeWidth={1.45} aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="swat-team-lines" aria-label="Linhas para identificar as equipes">
              {TEAM_LINES.map((number) => (
                <div key={number}>
                  <span aria-hidden="true" />
                  <p>Equipe / aluno:</p>
                </div>
              ))}
            </div>
          </div>

          <button
            className="secondary-button swat-print-button"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={17} aria-hidden="true" /> Imprimir molde das mãos
          </button>
        </div>
      </div>
    </section>
  );
}
