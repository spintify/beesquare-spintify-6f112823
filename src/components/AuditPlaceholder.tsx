import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function AuditPlaceholder({
  title,
  description,
  icon,
  bullets,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  bullets?: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-3xl font-bold tracking-tight bg-gradient-to-br from-blue-900 to-sky-600 bg-clip-text text-transparent"
          style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>
      <Card className="border-dashed bg-white/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 text-white">
              {icon ?? <Sparkles className="h-4 w-4" />}
            </span>
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This module is scaffolded and ready for implementation.</p>
          {bullets && bullets.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
