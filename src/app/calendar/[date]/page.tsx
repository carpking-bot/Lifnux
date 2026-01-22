import SchedulerPage from "@/components/calendar/SchedulerPage";

type CalendarDatePageProps = {
  params: { date?: string | string[] };
};

export default function CalendarDatePage({ params }: CalendarDatePageProps) {
  const dateValue = Array.isArray(params.date) ? params.date[0] : params.date;
  return <SchedulerPage date={dateValue ?? ""} />;
}
