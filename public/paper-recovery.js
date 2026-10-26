// A página estática continua legível mesmo sem JavaScript ou sem acesso ao armazenamento.
try {
  const theme = localStorage.getItem("helenastudy.theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  if (localStorage.getItem("helenastudy.language") === "en-US") {
    document.documentElement.lang = "en-US";
    for (const element of document.querySelectorAll("[data-recovery-en]")) {
      element.textContent = element.getAttribute("data-recovery-en");
    }
    if (document.body.dataset.recovery === "404") document.title = "404 · OlenaStudy";
  }
} catch {
  /* O conteúdo original e os links continuam disponíveis. */
}
