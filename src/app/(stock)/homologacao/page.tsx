import { notFound } from "next/navigation";
import { HomologacaoTab } from "@/components/tabs/HomologacaoTab";
import { isHomologEnvironment } from "@/lib/environment";

export default function HomologacaoPage() {
  if (!isHomologEnvironment()) {
    notFound();
  }

  return <HomologacaoTab />;
}

