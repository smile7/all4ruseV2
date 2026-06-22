declare module "cookie" {
  export type SerializeOptions = {
    path?: string;
    domain?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    priority?: "low" | "medium" | "high";
    encode?: (value: string) => string;
    partitioned?: boolean;
  };

  export function parse(
    str: string,
    options?: { decode?: (value: string) => string },
  ): Record<string, string | undefined>;

  export function serialize(
    name: string,
    value: string,
    options?: SerializeOptions,
  ): string;
}
