/** Curated Unsplash photos for corporate demo content (office, team, logistics, tech). */
const DEMO_UNSPLASH_PHOTOS = [
  "photo-1497366216548-37526070297c",
  "photo-1522071820081-009f0129c71c",
  "photo-1556761175-b413da4baf72",
  "photo-1553877522-43269d4ea984",
  "photo-1498050108023-c5249f4df085",
  "photo-1486312338219-ce68d2c6f44d",
  "photo-1517245386807-bb43f82c33c4",
  "photo-1542744173-8e7e53415bb0",
  "photo-1556760547-740b0a6015b3",
  "photo-1552664730-d307ca884978",
  "photo-1573164713714-d95e436ab8d6",
  "photo-1586528116311-ad8dd3c8310d",
  "photo-1563986768609-322da13575f3",
  "photo-1504384308090-c894fdcc538d",
  "photo-1454165804606-c3d57bc86b40",
  "photo-1460925895917-afdab827c52f",
  "photo-1551434678-e076c223a692",
  "photo-1521737711862-e3b97375f902",
  "photo-1600880292203-757bb62b4baf",
  "photo-1556761175-5973dc0f32e7",
  "photo-1516321318423-f06f85e504b3",
  "photo-1531482615710-855a5e4c4462",
  "photo-1573496359142-b8d87734a5a2",
  "photo-1557804506-669a67965ba0",
] as const;

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/** Stable demo content image URL from a seed and target dimensions. */
export const demoContentImageUrl = (seed: string, width: number, height: number): string => {
  const index = hashSeed(seed) % DEMO_UNSPLASH_PHOTOS.length;
  const photoId = DEMO_UNSPLASH_PHOTOS[index];
  const params = new URLSearchParams({
    w: String(width),
    h: String(height),
    fit: "crop",
    auto: "format",
  });
  return `https://images.unsplash.com/${photoId}?${params}`;
};
