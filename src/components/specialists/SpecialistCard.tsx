import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";

export function SpecialistCard({
  specialist,
}: {
  specialist: {
    id: string;
    headline: string;
    hourlyRate: number | null;
    ratingAvg: number;
    ratingCount: number;
    completedProjects: number;
    availability: string;
    user: { name: string };
    tags: { type: string; value: string }[];
  };
}) {
  const functionTags = specialist.tags.filter((t) => t.type === "FUNCTION").map((t) => t.value);
  const toolTags = specialist.tags.filter((t) => t.type === "TOOL").map((t) => t.value);

  return (
    <Link href={`/dashboard/specialists/${specialist.id}`}>
      <Card className="h-full hover:border-brand-300">
        <CardBody>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">{specialist.user.name}</p>
              <p className="text-xs text-ink-500">{specialist.headline}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-ink-700">★ {specialist.ratingAvg.toFixed(1)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {[...functionTags, ...toolTags].slice(0, 4).join(" · ")}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-ink-500">{specialist.completedProjects} projects</span>
            {specialist.hourlyRate && <span className="font-semibold text-ink-900">${specialist.hourlyRate}/hr</span>}
          </div>
          <Badge tone={specialist.availability === "Available now" ? "green" : "neutral"} className="mt-2">
            {specialist.availability}
          </Badge>
        </CardBody>
      </Card>
    </Link>
  );
}
