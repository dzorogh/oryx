export type OfficialDocLinkId =
  | "nextjs"
  | "react"
  | "three"
  | "r3f"
  | "drei"
  | "zod";

export type OfficialDocLink = {
  id: OfficialDocLinkId;
  title: string;
  url: string;
};

export const OFFICIAL_DOC_LINKS: ReadonlyArray<OfficialDocLink> = [
  { id: "nextjs", title: "Next.js Documentation", url: "https://nextjs.org/docs" },
  { id: "react", title: "React Documentation", url: "https://react.dev" },
  { id: "three", title: "Three.js Documentation", url: "https://threejs.org/docs" },
  { id: "r3f", title: "@react-three/fiber Documentation", url: "https://docs.pmnd.rs/react-three-fiber" },
  { id: "drei", title: "@react-three/drei Documentation", url: "https://docs.pmnd.rs/drei" },
  { id: "zod", title: "Zod Documentation", url: "https://zod.dev" },
] as const;
