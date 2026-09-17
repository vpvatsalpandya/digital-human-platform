import { TutorChat } from '@/modules/tutor/Chat';
export default async function TutorPage({ searchParams }: { searchParams: Promise<{ structure?: string }> }) {
  const sp = await searchParams;
  return <TutorChat structureId={sp.structure} />;
}
