import { AtlasScreen } from '@/modules/atlas/AtlasScreen';
import { AtlasDeepLink } from '@/modules/atlas/DeepLink';

export default async function AtlasPage({ searchParams }: { searchParams: Promise<{ structure?: string; mode?: string }> }) {
  const sp = await searchParams;
  return (<><AtlasDeepLink structureId={sp.structure} /><AtlasScreen mode={sp.mode ?? 'mbbs'} /></>);
}
