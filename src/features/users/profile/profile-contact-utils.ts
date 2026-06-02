import { Mail, MessageCircle, Phone, Send, type LucideIcon } from "lucide-react";
import type { PreferredChannel, UserProfileData } from "./user-profile-demo-data";

export type ProfileContactItem = {
  channel: PreferredChannel;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  icon: LucideIcon;
};

export const buildProfileContactItems = (profile: UserProfileData): ProfileContactItem[] => [
  {
    channel: "email",
    label: "Email",
    value: profile.email,
    href: `mailto:${profile.email}`,
    icon: Mail,
  },
  {
    channel: "phone",
    label: "Phone",
    value: profile.phone,
    href: `tel:${profile.phone.replace(/[^+\d]/g, "")}`,
    icon: Phone,
  },
  {
    channel: "telegram",
    label: "Telegram",
    value: profile.telegram,
    href: `https://t.me/${profile.telegram.replace(/^@/, "")}`,
    external: true,
    icon: Send,
  },
  {
    channel: "whatsapp",
    label: "WhatsApp",
    value: profile.whatsapp,
    href: `https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`,
    external: true,
    icon: MessageCircle,
  },
];
