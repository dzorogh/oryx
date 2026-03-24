/** Отступ основной колонки: фиксированный рейл (3rem) + ширина aside */
export const MODULE_MAIN_OFFSET_CLASS =
  "pl-[calc(3rem+min(200px,40vw))] sm:pl-[calc(3rem+200px)]";

/** @deprecated Используйте MODULE_MAIN_OFFSET_CLASS; алиас для существующих импортов PIM */
export const PIM_MAIN_OFFSET_CLASS = MODULE_MAIN_OFFSET_CLASS;

/** Фиксированный второй док (aside) слева от основного контента, как в PIM */
export const MODULE_ASIDE_DOCK_CLASS =
  "left-12 z-30 w-[min(200px,40vw)] overflow-hidden border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-white)] sm:w-[200px]";
