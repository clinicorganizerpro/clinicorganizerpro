declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}

declare module 'jsonwebtoken' {
  export type JwtPayload = Record<string, unknown> & {
    exp?: number;
    iat?: number;
    sub?: string;
  };

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string,
    options?: { expiresIn?: string | number },
  ): string;

  export function verify(token: string, secretOrPublicKey: string): string | JwtPayload;
}
