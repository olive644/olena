import { LocalRoom } from "../components/local-room";
import { RoomErrorBoundary } from "../components/room-error-boundary";
import { PageHeader } from "../components/app-navigation";

type Props = {
  joinCode?: string | undefined;
  projectorMode: boolean;
  accountName?: string | undefined;
  accountLoading: boolean;
  requireAccount: boolean;
  onExit(): void;
  onSignIn(): void;
};

export default function RoomView({ joinCode, ...props }: Props) {
  return (
    <main id="main-content" className="main-content room-view">
      <PageHeader />
      <RoomErrorBoundary onExit={props.onExit}>
        <LocalRoom initialJoinCode={joinCode} {...props} />
      </RoomErrorBoundary>
    </main>
  );
}
