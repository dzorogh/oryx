import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { COMPANY_SECTION_ICON_CLASS } from "./company-icon-styles";
import type { CompanyParameter, CompanyRequisites } from "./company-cabinet-demo-data";

type CompanyRequisitesSectionProps = {
  requisites: CompanyRequisites;
};

type ParameterFieldProps = {
  parameter: CompanyParameter;
};

const ParameterField = ({ parameter }: ParameterFieldProps) => (
  <li className="min-w-0 space-y-0.5">
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{parameter.label}</p>
    <p className="text-xs font-medium text-foreground">{parameter.value}</p>
  </li>
);

type ParameterGroupProps = {
  parameters: CompanyParameter[];
};

const ParameterGroup = ({ parameters }: ParameterGroupProps) => (
  <ul className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {parameters.map((parameter) => (
      <ParameterField key={parameter.id} parameter={parameter} />
    ))}
  </ul>
);

export const CompanyRequisitesSection = ({ requisites }: CompanyRequisitesSectionProps) => {
  const groups = [
    { id: "legal", parameters: requisites.legalParameters },
    { id: "bank", parameters: requisites.bankParameters },
  ].filter((group) => group.parameters.length > 0);

  return (
    <Card size="sm" className="h-full ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0">
      <div className="flex items-center gap-2 border-b border-[var(--corportal-border-grey)] px-3 py-2 sm:px-3.5">
        <Landmark className={COMPANY_SECTION_ICON_CLASS} aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Legal & bank details</h2>
      </div>

      <div className="space-y-3 p-3 sm:p-3.5">
        {groups.map((group, index) => (
          <div key={group.id} className={index > 0 ? "border-t border-[var(--corportal-border-grey)] pt-3" : undefined}>
            <ParameterGroup parameters={group.parameters} />
          </div>
        ))}
      </div>
    </Card>
  );
};
