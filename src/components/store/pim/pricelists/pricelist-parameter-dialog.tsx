"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FORMULA_VARIABLE_GROUPS } from "./pricelist-formula-variables";
import { PricelistFormulaReference } from "./pricelist-formula-reference";
import { slugifyParameter, type ParameterDef } from "./pricelists-parameters";

export type ParameterDialogValues = {
  label: string;
  slug: string;
  formula: string;
  baseValue: number;
};

type PricelistParameterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Other parameters in this region, used to populate the references list. */
  parameterDefs: ParameterDef[];
  /** Id of the parameter being edited, excluded from the references list. */
  editingParamId?: string;
  initialLabel?: string;
  initialSlug?: string;
  initialFormula?: string;
  onSubmit: (values: ParameterDialogValues) => void;
};

const SLUG_PATTERN = /^[a-z0-9_]+$/;

export const PricelistParameterDialog = ({
  open,
  onOpenChange,
  mode,
  parameterDefs,
  editingParamId,
  initialLabel = "",
  initialSlug = "",
  initialFormula = "",
  onSubmit,
}: PricelistParameterDialogProps) => {
  const [label, setLabel] = useState(initialLabel);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(initialSlug.length > 0);
  const [formula, setFormula] = useState(initialFormula);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset fields when the dialog transitions to open, adjusting state during
  // render rather than in an effect (project lint rule).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLabel(initialLabel);
      setSlug(initialSlug);
      setSlugEdited(initialSlug.length > 0);
      setFormula(initialFormula);
    }
  }

  const trimmedLabel = label.trim();
  const effectiveSlug = slugEdited ? slug.trim() : slugifyParameter(trimmedLabel);
  const isSlugValid = effectiveSlug.length > 0 && SLUG_PATTERN.test(effectiveSlug);
  const isValid = trimmedLabel.length > 0 && isSlugValid;

  const referenceParams = parameterDefs.filter(
    (def) => def.id !== editingParamId && (def.slug ?? def.id) !== effectiveSlug,
  );

  const referenceVariables: { label: string; slug: string }[] = [
    ...FORMULA_VARIABLE_GROUPS.flatMap((group) =>
      group.variables.map((variable) => ({ label: variable.label, slug: variable.slug })),
    ),
    ...referenceParams.map((def) => ({ label: def.label, slug: def.slug ?? def.id })),
  ];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    const parsedFormula = Number(formula.trim());
    const baseValue = Number.isFinite(parsedFormula) && formula.trim().length > 0 ? parsedFormula : 0;
    onSubmit({ label: trimmedLabel, slug: effectiveSlug, formula: formula.trim(), baseValue });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add parameter" : "Edit parameter"}</DialogTitle>
          <DialogDescription>
            A parameter adds a column computed from a formula. Reference other parameters and
            product values by their slug.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="-mx-4 flex max-h-[min(70svh,32rem)] flex-col gap-5 overflow-y-auto px-4">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label htmlFor="parameter-name" className="text-xs font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="parameter-name"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    if (!slugEdited) {
                      setSlug(slugifyParameter(event.target.value));
                    }
                  }}
                  placeholder="e.g. Delivery"
                  autoFocus
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="parameter-slug" className="text-xs font-medium text-foreground">
                  Slug
                </label>
                <Input
                  id="parameter-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugEdited(true);
                  }}
                  aria-invalid={slug.length > 0 && !isSlugValid}
                  className="font-mono text-xs"
                  placeholder="delivery"
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="parameter-formula" className="text-xs font-medium text-foreground">
                  Formula
                </label>
                <textarea
                  id="parameter-formula"
                  value={formula}
                  onChange={(event) => setFormula(event.target.value)}
                  rows={3}
                  placeholder="0"
                  className={cn(
                    "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs transition-colors outline-none",
                    "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                  )}
                />
              </div>
            </div>

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Reference</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                {referenceVariables.map((item) => (
                  <div key={item.slug} className="grid min-w-0 gap-0.5">
                    <dt className="truncate text-xs text-foreground" title={item.label}>
                      {item.label}
                    </dt>
                    <dd className="truncate font-mono text-[11px] text-muted-foreground" title={item.slug}>
                      {item.slug}
                    </dd>
                  </div>
                ))}
              </dl>
              <PricelistFormulaReference />
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {mode === "create" ? "Add parameter" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
