import { EMPLOYEE_OPTIONS } from "@/components/home/thanks-demo-data";

export type ThankYouEntry = {
  id: string;
  senderId: string;
  senderName: string;
  senderDepartment: string;
  recipientId: string;
  recipientName: string;
  recipientDepartment: string;
  message: string;
  sentAtLabel: string;
};

/** Portrait URLs (pravatar — same approach as Team profiles). */
export const THANKS_EMPLOYEE_AVATARS: Record<string, string> = {
  "emp-1": "https://i.pravatar.cc/320?u=team-petrova",
  "emp-2": "https://i.pravatar.cc/320?u=team-smirnov",
  "emp-3": "https://i.pravatar.cc/320?u=team-sokolova",
  "emp-4": "https://i.pravatar.cc/320?u=team-volkov",
  "emp-5": "https://i.pravatar.cc/320?u=thanks-olga-vlasova",
  "emp-6": "https://i.pravatar.cc/320?u=thanks-kirill-orlov",
  "emp-7": "https://i.pravatar.cc/320?u=team-egorova",
  "emp-8": "https://i.pravatar.cc/320?u=thanks-pavel-gromov",
  "emp-9": "https://i.pravatar.cc/320?u=thanks-elena-belova",
  "emp-10": "https://i.pravatar.cc/320?u=thanks-roman-zakharov",
  "emp-11": "https://i.pravatar.cc/320?u=thanks-tatyana-lebedeva",
  "emp-12": "https://i.pravatar.cc/320?u=thanks-alexey-nazarov",
};

export const getThanksEmployeeAvatarUrl = (employeeId: string): string =>
  THANKS_EMPLOYEE_AVATARS[employeeId] ??
  `https://i.pravatar.cc/320?u=thanks-fallback-${employeeId}`;

/** Demo: logged-in user (Alexey Nazarov). */
export const THANKS_CURRENT_USER_ID = "emp-12";
export const THANKS_CURRENT_USER_NAME = "Alexey Nazarov";
export const THANKS_CURRENT_USER_DEPARTMENT = "Security";

export const THANKS_PAGE_SIZE = 12;

type EmployeeRef = {
  id: string;
  fullName: string;
  department: string;
};

const ROSTER: EmployeeRef[] = EMPLOYEE_OPTIONS.map((employee) => ({
  id: employee.id,
  fullName: employee.fullName,
  department: employee.department,
}));

const OTHER_EMPLOYEES = ROSTER.filter((employee) => employee.id !== THANKS_CURRENT_USER_ID);

const CURRENT_USER: EmployeeRef = {
  id: THANKS_CURRENT_USER_ID,
  fullName: THANKS_CURRENT_USER_NAME,
  department: THANKS_CURRENT_USER_DEPARTMENT,
};

/** Varied length: one word → two sentences (cycled in generated entries). */
const MESSAGE_TEMPLATES = [
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
  "Great work on the security review checklist — saved us a lot of time.",
  "Appreciate the clear escalation notes — the customer case closed smoothly.",
  "Thank you for the quick help with the order and specification review.",
  "Thanks for closing the month-end reports ahead of schedule. The finance team noticed.",
  "Awesome support on the campaign landing QA pass. We shipped on time because of you.",
  "Your documentation update made the handoff much smoother for the team. Everyone found what they needed without pinging you.",
  "Thank you for aligning suppliers on the urgent spare-parts order. Production did not stop for a single shift.",
  "Thanks for mentoring the intern during the sprint demo prep. They presented confidently and the stakeholders were impressed.",
];

const formatSentAtLabel = (daysAgo: number) => {
  const date = new Date(2026, 4, 30 - daysAgo);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const createEntry = (
  id: string,
  sender: EmployeeRef,
  recipient: EmployeeRef,
  message: string,
  daysAgo: number,
): ThankYouEntry => ({
  id,
  senderId: sender.id,
  senderName: sender.fullName,
  senderDepartment: sender.department,
  recipientId: recipient.id,
  recipientName: recipient.fullName,
  recipientDepartment: recipient.department,
  message,
  sentAtLabel: formatSentAtLabel(daysAgo),
});

const buildGeneratedEntries = (): ThankYouEntry[] => {
  const entries: ThankYouEntry[] = [];
  let dayOffset = 12;

  for (let index = 0; index < 28; index += 1) {
    const recipient = OTHER_EMPLOYEES[index % OTHER_EMPLOYEES.length];
    entries.push(
      createEntry(
        `ty-sent-${index}`,
        CURRENT_USER,
        recipient,
        MESSAGE_TEMPLATES[index % MESSAGE_TEMPLATES.length],
        dayOffset,
      ),
    );
    dayOffset += 1;
  }

  for (let index = 0; index < 27; index += 1) {
    const sender = OTHER_EMPLOYEES[(index + 2) % OTHER_EMPLOYEES.length];
    entries.push(
      createEntry(
        `ty-received-${index}`,
        sender,
        CURRENT_USER,
        MESSAGE_TEMPLATES[(index + 3) % MESSAGE_TEMPLATES.length],
        dayOffset,
      ),
    );
    dayOffset += 1;
  }

  for (let index = 0; index < 14; index += 1) {
    const sender = OTHER_EMPLOYEES[index % OTHER_EMPLOYEES.length];
    const recipient = OTHER_EMPLOYEES[(index + 4) % OTHER_EMPLOYEES.length];
    if (sender.id === recipient.id) {
      continue;
    }
    entries.push(
      createEntry(
        `ty-feed-${index}`,
        sender,
        recipient,
        MESSAGE_TEMPLATES[(index + 6) % MESSAGE_TEMPLATES.length],
        dayOffset,
      ),
    );
    dayOffset += 1;
  }

  return entries;
};

const SEED_ENTRIES: ThankYouEntry[] = [
  {
    id: "ty-1",
    senderId: THANKS_CURRENT_USER_ID,
    senderName: THANKS_CURRENT_USER_NAME,
    senderDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    recipientId: "emp-1",
    recipientName: "Anna Petrova",
    recipientDepartment: "IT",
    message: "Thanks!",
    sentAtLabel: "May 28, 2026",
  },
  {
    id: "ty-2",
    senderId: THANKS_CURRENT_USER_ID,
    senderName: THANKS_CURRENT_USER_NAME,
    senderDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    recipientId: "emp-2",
    recipientName: "Ilya Smirnov",
    recipientDepartment: "Logistics",
    message:
      "Thanks for coordinating the shipment on a tight deadline. Warehouse and sales were aligned the whole week.",
    sentAtLabel: "May 26, 2026",
  },
  {
    id: "ty-3",
    senderId: THANKS_CURRENT_USER_ID,
    senderName: THANKS_CURRENT_USER_NAME,
    senderDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    recipientId: "emp-3",
    recipientName: "Maria Sokolova",
    recipientDepartment: "HR",
    message: "Onboarding help.",
    sentAtLabel: "May 22, 2026",
  },
  {
    id: "ty-4",
    senderId: "emp-1",
    senderName: "Anna Petrova",
    senderDepartment: "IT",
    recipientId: THANKS_CURRENT_USER_ID,
    recipientName: THANKS_CURRENT_USER_NAME,
    recipientDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    message:
      "Great work on the security review checklist — saved us a lot of time. We closed the audit window a day early.",
    sentAtLabel: "May 27, 2026",
  },
  {
    id: "ty-5",
    senderId: "emp-6",
    senderName: "Kirill Orlov",
    senderDepartment: "IT",
    recipientId: THANKS_CURRENT_USER_ID,
    recipientName: THANKS_CURRENT_USER_NAME,
    recipientDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    message: "Friday incident — thanks.",
    sentAtLabel: "May 24, 2026",
  },
  {
    id: "ty-6",
    senderId: "emp-7",
    senderName: "Svetlana Egorova",
    senderDepartment: "Support",
    recipientId: THANKS_CURRENT_USER_ID,
    recipientName: THANKS_CURRENT_USER_NAME,
    recipientDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    message: "Clear escalation notes.",
    sentAtLabel: "May 20, 2026",
  },
  {
    id: "ty-7",
    senderId: "emp-4",
    senderName: "Dmitry Volkov",
    senderDepartment: "Sales",
    recipientId: THANKS_CURRENT_USER_ID,
    recipientName: THANKS_CURRENT_USER_NAME,
    recipientDepartment: THANKS_CURRENT_USER_DEPARTMENT,
    message:
      "Thank you for the quick access audit for the enterprise deal. Legal signed off without another round of questions.",
    sentAtLabel: "May 18, 2026",
  },
  {
    id: "ty-8",
    senderId: "emp-5",
    senderName: "Olga Vlasova",
    senderDepartment: "Finance",
    recipientId: "emp-8",
    recipientName: "Pavel Gromov",
    recipientDepartment: "Operations",
    message: "Month-end — ahead of schedule. Thank you.",
    sentAtLabel: "May 25, 2026",
  },
  {
    id: "ty-9",
    senderId: "emp-9",
    senderName: "Elena Belova",
    senderDepartment: "Marketing",
    recipientId: "emp-10",
    recipientName: "Roman Zakharov",
    recipientDepartment: "IT",
    message: "QA pass — awesome.",
    sentAtLabel: "May 23, 2026",
  },
  {
    id: "ty-10",
    senderId: "emp-11",
    senderName: "Tatyana Lebedeva",
    senderDepartment: "Procurement",
    recipientId: "emp-2",
    recipientName: "Ilya Smirnov",
    recipientDepartment: "Logistics",
    message:
      "Thank you for aligning suppliers on the urgent spare-parts order. Logistics confirmed delivery windows the same afternoon.",
    sentAtLabel: "May 21, 2026",
  },
  {
    id: "ty-11",
    senderId: "emp-3",
    senderName: "Maria Sokolova",
    senderDepartment: "HR",
    recipientId: "emp-1",
    recipientName: "Anna Petrova",
    recipientDepartment: "IT",
    message: "Demo prep — thanks.",
    sentAtLabel: "May 19, 2026",
  },
];

export const THANK_YOU_ENTRIES: ThankYouEntry[] = [...SEED_ENTRIES, ...buildGeneratedEntries()];
