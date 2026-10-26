export function OnboardingPaperIcon({ name }: { name: string }) {
  const variant =
    name.startsWith("clock-") && !["clock-5", "clock-15"].includes(name)
      ? "clock-50"
      : name.startsWith("flag-") && !["flag-us", "flag-br"].includes(name)
        ? "flag-es"
        : name;
  return (
    <svg
      className="onboarding-paper-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-icon={name}
    >
      <use
        href={
          name.startsWith("journey-")
            ? `/navigation-icons/paper/onboarding-journey.svg#${name.slice(8)}`
            : `/navigation-icons/paper/onboarding-paper-icon.svg#${variant}`
        }
      />
    </svg>
  );
}
