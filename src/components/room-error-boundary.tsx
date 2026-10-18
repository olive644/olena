import { uiText } from "../i18n/runtime";
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
        <h3>{uiText(961)}</h3>
        <p>{uiText(962)}</p>
        <button className="primary-button" onClick={() => window.location.reload()}>
          <img src="/room-icons/reconnect.svg" alt="" width="24" height="24" />
          {uiText(963)}
        </button>
        {this.props.onExit && (
          <button className="secondary-button" type="button" onClick={this.props.onExit}>
            {uiText(485)}
          </button>
        )}
      </section>
    ) : (
      this.props.children
    );
  }
}
