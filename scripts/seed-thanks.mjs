#!/usr/bin/env node
/**
 * Seed Pulse Thanks into the Oryx demo Supabase.
 * Reads NEXT_PUBLIC_SUPABASE_* from .env.local. Does not print secrets.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnv = () => {
  const env = {};
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
};

const ROSTER = [
  { id: "emp-1", name: "Anna Petrova", department: "IT" },
  { id: "emp-2", name: "Ilya Smirnov", department: "Logistics" },
  { id: "emp-3", name: "Maria Sokolova", department: "HR" },
  { id: "emp-4", name: "Dmitry Volkov", department: "Sales" },
  { id: "emp-5", name: "Olga Vlasova", department: "Finance" },
  { id: "emp-6", name: "Kirill Orlov", department: "IT" },
  { id: "emp-7", name: "Svetlana Egorova", department: "Support" },
  { id: "emp-8", name: "Pavel Gromov", department: "Operations" },
  { id: "emp-9", name: "Elena Belova", department: "Marketing" },
  { id: "emp-10", name: "Roman Zakharov", department: "IT" },
  { id: "emp-11", name: "Tatyana Lebedeva", department: "Procurement" },
  { id: "emp-12", name: "Alexey Nazarov", department: "Security" },
];

const CURRENT = ROSTER.find((person) => person.id === "emp-12");
const OTHERS = ROSTER.filter((person) => person.id !== CURRENT.id);

const MESSAGES = [
  "Thanks!",
  "Bravo.",
  "Legend.",
  "Much appreciated.",
  "Thanks for the quick fix.",
  "Great support on the release.",
  "You saved the day.",
  "Thank you for jumping on the call.",
  "Thanks for coordinating the shipment on a tight deadline.",
  "Special thanks for onboarding the new team member.",
];

const label = (daysAgo) =>
  new Date(2026, 4, 30 - daysAgo).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const row = (id, sender, recipient, message, daysAgo) => ({
  id,
  sender_id: sender.id,
  sender_name: sender.name,
  sender_department: sender.department,
  recipient_id: recipient.id,
  recipient_name: recipient.name,
  recipient_department: recipient.department,
  message,
  sent_at_label: label(daysAgo),
});

const rows = [];
let day = 2;
for (let index = 0; index < 28; index += 1) {
  rows.push(row(`ty-sent-${index}`, CURRENT, OTHERS[index % OTHERS.length], MESSAGES[index % MESSAGES.length], day));
  day += 1;
}
for (let index = 0; index < 27; index += 1) {
  rows.push(
    row(`ty-received-${index}`, OTHERS[(index + 2) % OTHERS.length], CURRENT, MESSAGES[(index + 3) % MESSAGES.length], day),
  );
  day += 1;
}
for (let index = 0; index < 14; index += 1) {
  const sender = OTHERS[index % OTHERS.length];
  const recipient = OTHERS[(index + 4) % OTHERS.length];
  if (sender.id === recipient.id) continue;
  rows.push(row(`ty-feed-${index}`, sender, recipient, MESSAGES[(index + 6) % MESSAGES.length], day));
  day += 1;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
}

const endpoint = `${url}/rest/v1/thank_you_entry`;
const res = await fetch(`${endpoint}?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  const body = await res.text();
  throw new Error(`seed failed: ${res.status} (${body.length} bytes)`);
}

const countRes = await fetch(`${endpoint}?select=id`, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    Prefer: "count=exact",
    Range: "0-0",
  },
});
const range = countRes.headers.get("content-range");
console.log(`seed_ok status=${res.status} posted=${rows.length} content_range=${range}`);
