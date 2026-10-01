import { Component, type ReactNode } from "react";

export class RoomErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
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
          Reconectar
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
