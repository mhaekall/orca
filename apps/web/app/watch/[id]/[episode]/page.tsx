import { Suspense } from "react";
import WatchClientPage from "./ClientPage";

export function generateStaticParams() {
  return [{ id: "fallback", episode: "1" }];
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-black" />}>
      <WatchClientPage />
    </Suspense>
  );
}