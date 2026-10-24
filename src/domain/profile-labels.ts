export function profileLabelNames(username: string, creks: boolean): string[] {
  return username === "bizzok"
    ? ["DEV", "GALAXIA", "BETA TESTER"]
    : username === "dreyxnn"
      ? ["GALAXIA", "BETA TESTER"]
      : username === "eito" || username === "pranksterbrain"
        ? ["CREKS", "BETA TESTER"]
        : creks || username === "miauyw"
          ? username === "oliver644"
            ? ["CREKS", "DEV", "BETA TESTER", "GALAXIA"]
            : ["CREKS"]
          : [];
}
