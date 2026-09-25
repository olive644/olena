// Exclusão da conta, no mesmo estilo de confirmação do GitHub: a pessoa precisa digitar o
// nome da conta, exatamente como aparece, para o botão final ser liberado.

export type AccountIdentity = {
  displayName?: string | undefined;
  email?: string | undefined;
};

// O nome que a pessoa deve digitar: o nome da conta Google e, se não houver, o e-mail.
export function accountConfirmationName(identity: AccountIdentity): string {
  return (identity.displayName?.trim() || identity.email?.trim() || "").trim();
}

// Igualdade exata (com maiúsculas e minúsculas), como no GitHub. Um nome vazio nunca confirma.
export function isDeletionConfirmed(typed: string, expected: string): boolean {
  return expected.length > 0 && typed.trim() === expected;
}

export type AccountDeletionSteps = {
  // Pede o login do Google de novo. A exclusão é irreversível, então sempre confirma a identidade.
  reauthenticate: () => Promise<void>;
  // Apaga os estudos guardados na nuvem.
  deleteCloudData: () => Promise<void>;
  // Apaga a conta de acesso.
  deleteAuthUser: () => Promise<void>;
  // Apaga do aparelho os dados pessoais e encerra o acesso à agenda.
  wipeLocal: () => void;
};

export type AccountDeletionFailure = "cancelled" | "failed";

export class AccountDeletionError extends Error {
  constructor(readonly reason: AccountDeletionFailure) {
    super(reason);
  }
}

function isCancelledSignIn(cause: unknown): boolean {
  const code = (cause as { code?: unknown } | null)?.code;
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/user-cancelled"
  );
}

// Ordem pensada para não deixar a pessoa sem nada em caso de falha: só depois de confirmar a
// identidade os estudos da nuvem são apagados, e só depois de a conta ser apagada o aparelho é
// limpo. Se algum passo falhar, os passos seguintes não acontecem.
export async function deleteAccountEverywhere(steps: AccountDeletionSteps): Promise<void> {
  try {
    await steps.reauthenticate();
  } catch (cause) {
    throw new AccountDeletionError(isCancelledSignIn(cause) ? "cancelled" : "failed");
  }
  try {
    await steps.deleteCloudData();
    await steps.deleteAuthUser();
  } catch {
    throw new AccountDeletionError("failed");
  }
  steps.wipeLocal();
}
