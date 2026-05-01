import { Suspense } from "react";
import WatchClientPage from "./ClientPage";

export const runtime = "edge";

/* CAPACITOR_STATIC_PARAMS
export function generateStaticParams() {
  return [{ id: "fallback", episode: "1" }];
}
*/

export default async function WatchPage({ params }: { params: Promise<{ id: string, episode: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#13111a]" />}>
      <WatchClientPage id={resolvedParams.id} episode={resolvedParams.episode} />
    </Suspense>
  );
}