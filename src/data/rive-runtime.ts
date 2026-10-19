/**
 * Runtime oficial do Rive (@rive-app/canvas 2.43.0, MIT), vendorizado em public/helena-assistant.
 * Fica fora do bundle do React: o script e o WebAssembly só são buscados quando a animação da
 * Helena entra, sempre do próprio site (CSP com script-src e connect-src 'self').
 */
export type RiveInput = { name: string; value: number | boolean };

export type RivePlayer = {
  play(): void;
  pause(): void;
  cleanup(): void;
  resizeDrawingSurfaceToCanvas(): void;
  resizeToCanvas(): void;
  stateMachineInputs(name: string): RiveInput[] | undefined;
};

type RiveOptions = {
  src: string;
  canvas: HTMLCanvasElement;
  stateMachines: string;
  autoplay: boolean;
  layout: object;
  onLoad: () => void;
  onLoadError: () => void;
  onStateChange?: (event: { data?: unknown }) => void;
};

export type RiveRuntime = {
  Rive: new (options: RiveOptions) => RivePlayer;
  Layout: new (options: { fit: unknown }) => object;
  Fit: { Contain: unknown };
  RuntimeLoader: { setWasmUrl(url: string): void };
};

export const RIVE_SCRIPT = "/helena-assistant/rive.js?v=2.43.0";
export const RIVE_WASM = "/helena-assistant/rive.wasm?v=2.43.0";

let loading: Promise<RiveRuntime> | null = null;

function current(): RiveRuntime | undefined {
  return (window as Window & { rive?: RiveRuntime }).rive;
}

export function loadRiveRuntime(): Promise<RiveRuntime> {
  const ready = current();
  if (ready) {
    ready.RuntimeLoader.setWasmUrl(RIVE_WASM);
    return Promise.resolve(ready);
  }
  if (loading) return loading;
  loading = new Promise<RiveRuntime>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RIVE_SCRIPT;
    script.async = true;
    script.onload = () => {
      const runtime = current();
      if (!runtime) {
        reject(new Error("Runtime do Rive ausente"));
        return;
      }
      runtime.RuntimeLoader.setWasmUrl(RIVE_WASM);
      resolve(runtime);
    };
    script.onerror = () => reject(new Error("Falha ao carregar o runtime do Rive"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // uma próxima ativação tenta de novo
    throw error;
  });
  return loading;
}
