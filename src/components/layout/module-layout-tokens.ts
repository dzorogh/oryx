/** Отступ основной колонки: фиксированный рейл (3rem) + ширина aside */
export const MODULE_MAIN_OFFSET_CLASS = "pl-0 sm:pl-[calc(3rem+200px)]";

/** Full-width module page shell (padding only, no max-width). */
export const MODULE_PAGE_CONTENT_CLASS =
  "flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:px-8";

/** @deprecated Используйте MODULE_MAIN_OFFSET_CLASS; алиас для существующих импортов PIM */
export const PIM_MAIN_OFFSET_CLASS = MODULE_MAIN_OFFSET_CLASS;

/** Фиксированный второй док (aside) слева от основного контента, как в PIM */
export const MODULE_ASIDE_DOCK_CLASS =
  "left-12 z-30 w-[min(200px,40vw)] overflow-hidden border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-white)] sm:w-[200px]";
