import { EquipmentRequestDecisionPage } from "@/components/equipment/EquipmentRequestDecisionPage";

export default async function SolicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentRequestDecisionPage requestId={Number(id)} />;
}