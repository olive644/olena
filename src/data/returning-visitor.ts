// Preferência deste navegador, sem nome, conta, endereço IP ou dados de estudo.
export const RETURNING_VISITOR_ITEM = "olena.returning.v1";

export function isReturningVisitor(): boolean {
  try {
    return localStorage.getItem(RETURNING_VISITOR_ITEM) === "1";
  } catch {
    return false;
  }
}

export function rememberReturningVisitor(): void {
  try {
    localStorage.setItem(RETURNING_VISITOR_ITEM, "1");
  } catch {
    // O login continua disponível sem armazenamento.
  }
}
