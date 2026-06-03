"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FORMULA_REFERENCE_SECTIONS,
  type FormulaReferenceSection,
} from "./pricelist-formula-reference-data";

const ReferenceSection = ({ section, defaultOpen }: { section: FormulaReferenceSection; defaultOpen: boolean }) => (
  <Collapsible defaultOpen={defaultOpen} className="group rounded-lg border border-border/60">
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
      {section.title}
      <ChevronDown
        className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]:rotate-180"
        aria-hidden
      />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="border-t border-border/60">
        <table className="w-full text-left text-xs">
          <tbody>
            {section.entries.map((entry) => (
              <tr key={entry.syntax} className="border-b border-border/40 last:border-0 align-top">
                <td className="w-[35%] px-3 py-1.5 font-mono text-[11px] text-foreground">{entry.syntax}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{entry.description}</td>
                <td className="w-[28%] px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{entry.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
);

export const PricelistFormulaReference = () => (
  <div className="flex flex-col gap-2">
    {FORMULA_REFERENCE_SECTIONS.map((section, index) => (
      <ReferenceSection key={section.title} section={section} defaultOpen={index === 0} />
    ))}
  </div>
);
