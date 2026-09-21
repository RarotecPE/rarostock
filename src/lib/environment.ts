export function isHomologEnvironment(): boolean {
  const label = (process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL ?? "").trim().toLowerCase();
  return label.includes("homolog") || process.env.NODE_ENV === "development";
}

