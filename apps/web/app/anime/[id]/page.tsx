import { Suspense } from "react";
import DetailSkeleton from "@/features/detail/DetailSkeleton";
import AnimeClientPage from "./ClientPage";

export const runtime = "edge";

/* CAPACITOR_STATIC_PARAMS
export function generateStaticParams() {
  return [{ id: "fallback" }];
}
*/

export default function AnimePage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AnimeClientPage />
    </Suspense>
  );
}
