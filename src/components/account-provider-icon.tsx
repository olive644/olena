export function AccountProviderIcon({ provider }: { provider: "google" | "discord" }) {
  return (
    <img src={`/navigation-icons/paper/profile-${provider}.svg`} alt="" width="32" height="32" />
  );
}
