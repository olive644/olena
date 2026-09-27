// Espelho assíncrono do espaço de estudos em IndexedDB, ao lado do localStorage síncrono de
// sempre. Etapa 1 da migração (ver docs/CURRENT_STATE_AUDIT.md): o app continua lendo e
// gravando no localStorage exatamente como antes (nada muda se o IndexedDB falhar ou não
// existir, como em alguns modos de navegação privada); a cada gravação, o mesmo conteúdo é
// espelhado aqui também, em segundo plano, sem nunca poder atrapalhar o salvamento de verdade.
// Guarda um único registro (o espaço de estudos inteiro, como um texto serializado), do mesmo
// jeito que uma única chave do localStorage guarda hoje. Quando o espelho tiver um histórico
// confiável de uso real, a etapa 2 troca a leitura inicial para preferir o IndexedDB e sobe o
// teto de traços por folha, que hoje existe por causa do limite pequeno do localStorage.

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
      try {
        const db = await connect();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(value, RECORD_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Espelho best-effort: uma falha de gravação aqui nunca deve impedir o salvamento
        // de verdade, que continua indo para o localStorage.
      }
    },
  };
}
