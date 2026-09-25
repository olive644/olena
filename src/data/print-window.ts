// Abre uma janela em branco para montar uma impressão (PDF pelo navegador).
// Com "noopener" nas opções o navegador devolve null: a janela abre, mas o app não
// consegue escrever nela e mostra um aviso falso de pop-up bloqueado. O certo é abrir
// normalmente e cortar o vínculo depois (opener nulo), para a janela não poder
// controlar esta página.
export function openPrintWindow(): Window | null {
  const printWindow = window.open("", "_blank");
  if (printWindow) printWindow.opener = null;
  return printWindow;
}
