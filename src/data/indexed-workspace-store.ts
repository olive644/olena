// Armazenamento do espaço de estudos em IndexedDB. Guarda um único registro (o espaço de
// estudos inteiro, como um texto serializado), do mesmo jeito que uma única chave do
// localStorage guarda hoje.
//
// Etapa 1 da migração (ver docs/CURRENT_STATE_AUDIT.md): só um espelho best-effort ao lado do
// localStorage, que seguia sendo a gravação de verdade; uma falha aqui nunca aparecia para
// quem usa o app.
//
// Etapa 2: o IndexedDB passa a ser quem garante o salvamento de verdade (tem bem mais espaço
// que os cerca de 5 MB por site do localStorage). Por isso `set()` agora propaga o erro em vez
// de engolir: quem chama precisa saber se a gravação de verdade falhou, para avisar a pessoa
// que o armazenamento está cheio. `get()` continua best-effort: uma falha de leitura só faz o
// app seguir com o que já tinha carregado do localStorage.

const DATABASE_NAME = "helenastudy";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const RECORD_KEY = "current";

export type WorkspaceKeyValueStore = {
  get(): Promise<string | undefined>;
  set(value: string): Promise<void>;
};

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Cria o espelho sobre um IDBFactory (o `indexedDB` do navegador, por padrão). Devolve nulo
// quando não há IndexedDB disponível, para quem chama simplesmente não espelhar nada.
export function openIndexedWorkspaceStore(factory?: IDBFactory): WorkspaceKeyValueStore | null {
  const resolved = factory ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
  if (!resolved) return null;
  const idb: IDBFactory = resolved;
  let database: Promise<IDBDatabase> | null = null;
  function connect(): Promise<IDBDatabase> {
    if (!database) database = openDatabase(idb);
    return database;
  }
  return {
    async get() {
      try {
        const db = await connect();
        const tx = db.transaction(STORE_NAME, "readonly");
        return await promisifyRequest(tx.objectStore(STORE_NAME).get(RECORD_KEY));
      } catch {
        // Espelho best-effort: uma falha de leitura aqui nunca deve impedir o app de abrir.
        return undefined;
      }
    },
    async set(value: string) {
      const db = await connect();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(value, RECORD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}
