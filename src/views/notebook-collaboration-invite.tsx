import { NoteCaptureTools } from "../components/note-capture-tools";

export default function NotebookCollaborationInvite({ code }: { code: string }) {
  return (
    <main className="notebook-invite-entry">
      <h1>Caderno compartilhado</h1>
      <p>Informe seu nome e entre na sala para escrever junto.</p>
      <NoteCaptureTools
        draftPageKey={`shared-${code}`}
        initialJoinCode={code}
        onSave={() => undefined}
      />
    </main>
  );
}
