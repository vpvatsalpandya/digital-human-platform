import { AssessmentRunner } from '@/modules/assessment/Runner';
export default async function AssessPage({ searchParams }: { searchParams: Promise<{ structure?: string }> }) {
  const sp = await searchParams;
  return <AssessmentRunner structureId={sp.structure} />;
}
