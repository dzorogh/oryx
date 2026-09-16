import type { ThankYouEntry } from "@/features/pulse/thanks/thanks-demo-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const THANKS_TABLE = "thank_you_entry";

export type ThankYouEntryRow = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_department: string;
  recipient_id: string;
  recipient_name: string;
  recipient_department: string;
  message: string;
  sent_at_label: string;
};

export const thankYouEntryToRow = (entry: ThankYouEntry): ThankYouEntryRow => ({
  id: entry.id,
  sender_id: entry.senderId,
  sender_name: entry.senderName,
  sender_department: entry.senderDepartment,
  recipient_id: entry.recipientId,
  recipient_name: entry.recipientName,
  recipient_department: entry.recipientDepartment,
  message: entry.message,
  sent_at_label: entry.sentAtLabel,
});

export const thankYouRowToEntry = (row: ThankYouEntryRow): ThankYouEntry => ({
  id: row.id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  senderDepartment: row.sender_department,
  recipientId: row.recipient_id,
  recipientName: row.recipient_name,
  recipientDepartment: row.recipient_department,
  message: row.message,
  sentAtLabel: row.sent_at_label,
});

export const listThankYouEntries = async (): Promise<ThankYouEntry[]> => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await client
    .from(THANKS_TABLE)
    .select(
      "id,sender_id,sender_name,sender_department,recipient_id,recipient_name,recipient_department,message,sent_at_label",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => thankYouRowToEntry(row as ThankYouEntryRow));
};

export const insertThankYouEntry = async (entry: ThankYouEntry): Promise<ThankYouEntry> => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await client
    .from(THANKS_TABLE)
    .insert(thankYouEntryToRow(entry))
    .select(
      "id,sender_id,sender_name,sender_department,recipient_id,recipient_name,recipient_department,message,sent_at_label",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return thankYouRowToEntry(data as ThankYouEntryRow);
};

export { isSupabaseConfigured };
