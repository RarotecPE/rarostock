import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RaroStock",
    short_name: "RaroStock",
    description:
      "Plataforma de controle interno e gestao de processos operacionais de estoque.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B0F17",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/rarostock-logo.png",
        sizes: "607x607",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/rarostock-logo.png",
        sizes: "607x607",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
