import { useEffect, useState } from "react";
import { libraryFile, imageFingerprint } from "../data/library-files";
import type { StudyMaterial } from "../domain/workspace";
import { uiText } from "../i18n/runtime";
import { HelenaLoading } from "./helena-loading";

export default function LibraryImageReader({
  material,
  scope,
}: {
  material: StudyMaterial;
  scope: string;
}) {
  const [url, setUrl] = useState(""),
    [missing, setMissing] = useState(false),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false,
      objectUrl = "";
    void libraryFile(scope, material.id)
      .then((file) => {
        if (disposed) return;
        if (!file) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!disposed) setMissing(true);
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [material.id, scope, revision]);
  return (
    <div className="library-image-reader">
      <p>{uiText("A imagem fica neste dispositivo, sem envio a terceiros.")}</p>
      {url ? (
        <img
          src={url}
          alt={material.title}
          onError={() => {
            setMissing(true);
            setUrl("");
          }}
        />
      ) : (
        !missing && <HelenaLoading compact label={uiText("Abrindo material")} />
      )}
      {missing && (
        <label className="field">
          <span>{uiText("Selecionar a imagem original")}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if ((await imageFingerprint(file)) !== material.content) throw new Error();
                await libraryFile(scope, material.id, file);
                setMissing(false);
                setError("");
                setRevision((value) => value + 1);
              } catch {
                setError(
                  uiText("Selecione a mesma imagem original, PNG, JPEG ou WebP de até 5 MB."),
                );
              }
            }}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
