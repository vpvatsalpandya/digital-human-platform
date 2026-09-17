import { SliceViewer } from '@/modules/radiology/SliceViewer';
export default async function RadiologyPage({ searchParams }: { searchParams: Promise<{ structure?: string }> }) {
  const sp = await searchParams;
  return <SliceViewer initialStructure={sp.structure} />;
}
