import {
  THANK_YOU_ENTRIES,
  THANKS_CURRENT_USER_ID,
  type ThankYouEntry,
} from "@/features/pulse/thanks/thanks-demo-data";

/** @deprecated Use ThankYouEntry from thanks-demo-data. */
export type MyThankYouEntry = {
  id: string;
  recipientName: string;
  recipientDepartment: string;
  message: string;
  sentAtLabel: string;
};

const toMyEntry = (entry: ThankYouEntry): MyThankYouEntry => ({
  id: entry.id,
  recipientName: entry.recipientName,
  recipientDepartment: entry.recipientDepartment,
  message: entry.message,
  sentAtLabel: entry.sentAtLabel,
});

/** @deprecated Use THANK_YOU_ENTRIES filtered by sender. */
export const MY_THANK_YOU_ENTRIES: MyThankYouEntry[] = THANK_YOU_ENTRIES.filter(
  (entry) => entry.senderId === THANKS_CURRENT_USER_ID,
).map(toMyEntry);
