declare module "sql.js" {
  interface Statement {
    run(values: (string | number | null)[]): void;
    free(): void;
  }
  interface Database {
    export(): Uint8Array;
    run(sql: string): void;
    prepare(sql: string): Statement;
    exec(
      sql: string,
    ): { columns: string[]; values: (string | number | null)[][] }[];
    close(): void;
  }
  export interface Sql {
    Database: new (data?: Uint8Array) => Database;
  }
  export default function init(options?: {
    locateFile?: (file: string) => string;
  }): Promise<Sql>;
}
