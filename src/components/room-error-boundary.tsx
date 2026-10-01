import { Component, type ReactNode } from "react";

export class RoomErrorBoundary extends Component<
  { children: ReactNode; onExit?: () => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <section className="room-reconnect-error" role="alert">
        <h3>Não foi possível exibir a sala</h3>
        <p>Sua participação está salva nesta aba. Recarregue para tentar reconectar.</p>
        <button className="primary-button" onClick={() => window.location.reload()}>
          <img src="/room-icons/reconnect.svg" alt="" width="24" height="24" />
          Reconectar
        </button>
        {this.props.onExit && (
          <button className="secondary-button" type="button" onClick={this.props.onExit}>
            Voltar ao aplicativo
          </button>
        )}
      </section>
    ) : (
      this.props.children
    );
  }
}
