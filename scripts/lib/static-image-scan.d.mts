export type StaticImageViolation = {
  line: number;
  column: number;
  text: string;
  kind: string;
};

export declare const shouldScanSourceFile: (relativePath: string) => boolean;

export declare const scanSourceStaticImagePaths: (
  content: string,
  relativePath: string,
) => StaticImageViolation[];

export declare const isAllowedPublicFile: (relativePath: string) => boolean;

export declare const scanPublicImageFiles: (publicFiles: string[]) => StaticImageViolation[];
