import ranges from '@/data/demo/ranges.json';
import { ProposalForm } from '@/components/proposal/ProposalForm';

export function generateStaticParams() {
  return ranges.map((r) => ({ rangeId: r.id }));
}

export default async function ProposePage({ params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return <ProposalForm rangeId={rangeId} />;
}
