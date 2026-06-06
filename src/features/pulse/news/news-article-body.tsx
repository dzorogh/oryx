import type { NewsBlock } from "@/components/home/news-demo-data";

type NewsArticleBodyProps = {
  blocks: NewsBlock[];
};

export const NewsArticleBody = ({ blocks }: NewsArticleBodyProps) => (
  <div className="flex flex-col gap-5 text-[15px] leading-7 text-foreground/85 md:text-base md:leading-8">
    {blocks.map((block, index) => {
      switch (block.type) {
        case "heading":
          return (
            <h2
              key={`${block.id}-${index}`}
              id={block.id}
              className="scroll-mt-24 pt-2 font-heading text-lg font-semibold tracking-tight text-foreground md:text-xl"
            >
              {block.text}
            </h2>
          );
        case "quote":
          return (
            <blockquote
              key={index}
              className="my-1 border-l-2 border-foreground/20 pl-4 text-base font-medium text-foreground italic md:text-lg"
            >
              <p className="not-italic">“{block.text}”</p>
              <footer className="mt-2 text-sm font-normal text-muted-foreground not-italic">
                — {block.cite}
              </footer>
            </blockquote>
          );
        case "list":
          return (
            <ul key={index} className="flex flex-col gap-2 pl-1">
              {block.items.map((listItem, itemIndex) => (
                <li key={itemIndex} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/40"
                  />
                  <span>{listItem}</span>
                </li>
              ))}
            </ul>
          );
        case "paragraph":
        default:
          return (
            <p key={index} className="text-pretty">
              {block.text}
            </p>
          );
      }
    })}
  </div>
);
