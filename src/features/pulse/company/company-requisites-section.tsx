import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { COMPANY_COUNT_BADGE_CLASS, COMPANY_SECTION_ICON_CLASS } from "./company-icon-styles";
import type { CompanyParameter, CompanyRequisites } from "./company-cabinet-demo-data";

type CompanyRequisitesSectionProps = {
  requisites: CompanyRequisites;
};

type ParameterFieldProps = {
  parameter: CompanyParameter;
};

const ParameterField = ({ parameter }: ParameterFieldProps) => (
  <li className="mb-3 min-w-0 break-inside-avoid space-y-0.5">
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{parameter.label}</p>
    <p className="text-xs font-medium leading-relaxed text-foreground break-words">{parameter.value}</p>
  </li>
);

export const CompanyRequisitesSection = ({ requisites }: CompanyRequisitesSectionProps) => {
  const hasRequisites = requisites.legalParameters.length > 0;

  return (
    <Card
      size="sm"
      id="company-details"
      className="ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0"
    >
      <div className="flex items-center gap-2 border-b border-[var(--corportal-border-grey)] px-3 py-2 sm:px-3.5">
        <Landmark className={COMPANY_SECTION_ICON_CLASS} aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Details</h2>
        {hasRequisites ? (
          <span className={COMPANY_COUNT_BADGE_CLASS}>{requisites.legalParameters.length}</span>
        ) : null}
      </div>

      <div className="p-2 sm:p-2.5">
        {hasRequisites ? (
          <ul className="columns-1 gap-x-6 p-1 sm:columns-2 lg:columns-3">
            {requisites.legalParameters.map((parameter) => (
              <ParameterField key={parameter.id} parameter={parameter} />
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--corportal-border-grey)] bg-muted/20 px-3 py-4">
            <Landmark className={COMPANY_SECTION_ICON_CLASS} strokeWidth={1.5} aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">No requisites added</p>
              <p className="text-xs text-muted-foreground">
                Company requisites will appear here once they are configured.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
