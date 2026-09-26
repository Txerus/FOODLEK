import { CalendarPlusIcon } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { RegenerateButton } from "./regenerate-button";

export function EmptyWeek() {
  return (
    <Empty className="surface py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarPlusIcon />
        </EmptyMedia>
        <EmptyTitle>Pas encore de menu cette semaine</EmptyTitle>
        <EmptyDescription>FOODLEK calcule les repas, les portions de chacun et la liste de courses en quelques secondes.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <RegenerateButton label="Créer ma semaine" variant="default" />
      </EmptyContent>
    </Empty>
  );
}
