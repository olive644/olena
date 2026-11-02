import { profileFrame } from "../domain/profile-cosmetics";
export function ProfileFrameArt({ frame }: { frame: unknown }) {
  const id = profileFrame(frame);
  return id === "none" ? null : (
    <img
      className="profile-frame-art"
      src={"/profile-cosmetics/" + id + ".svg"}
      alt=""
      aria-hidden="true"
      width="180"
      height="180"
    />
  );
}
