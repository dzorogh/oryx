import Link from "next/link";
import { Construction } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";

type StorePlaceholderPageProps = {
  title: string;
  description?: string;
};

export const StorePlaceholderPage = ({ title, description }: StorePlaceholderPageProps) => (
  <main className="min-h-screen bg-muted/30">
    <section className="p-4 py-4">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/store/catalog" aria-label="Open Store section" />}>
                Store
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <Card
          size="sm"
          className="flex flex-col items-center justify-center gap-3 py-16 text-center ring-1 ring-[var(--corportal-border-grey)]"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Construction aria-hidden className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Section in development</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Functionality for the &ldquo;{title}&rdquo; section will appear here. We are already working on it.
            </p>
          </div>
        </Card>
      </div>
    </section>
  </main>
);
