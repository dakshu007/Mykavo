import { Card } from "@/components/ui/card";

/** Error card shared by the free tools. */
export function ToolError({ message }: { message: string }) {
  return (
    <Card className="border border-critical/20 bg-critical-soft">
      <p className="text-sm font-medium text-red-700" role="alert">
        {message}
      </p>
    </Card>
  );
}
