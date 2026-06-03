export type UiViolation = {
  line: number;
  column: number;
  text: string;
  kind: string;
};

export declare const stripComments: (source: string) => string;

export declare const scanEnglishUi: (content: string, filePath?: string) => UiViolation[];

export declare const shouldScanFile: (relativePath: string) => boolean;
