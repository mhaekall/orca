import { ScheduleView } from "@/features/schedule/ScheduleView";
import { api } from "@/core/lib/api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  let schedule = {};
  let errorMsg = null;

  try {
    const res = await api.schedule({ next: { revalidate: 3600 } });
    if (res.success && res.data) {
      schedule = res.data;
    }
  } catch (error: any) {
    errorMsg = error.message || String(error);
    console.error("Failed to fetch schedule data:", error);
  }

  if (errorMsg) {
    return <div style={{ color: 'red', padding: '20px' }}>Error fetching data: {errorMsg}</div>;
  }

  return <ScheduleView initialSchedule={schedule} />;
}
