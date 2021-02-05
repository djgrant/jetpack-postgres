export {};

declare global {
  var plv8: Plv8;
  var DEBUG5: "DEBUG5";
  var DEBUG4: "DEBUG4";
  var DEBUG3: "DEBUG3";
  var DEBUG2: "DEBUG2";
  var DEBUG1: "DEBUG1";
  var LOG: "LOG";
  var INFO: "INFO";
  var NOTICE: "NOTICE";
  var WARNING: "WARNING";
  var ERROR: "ERROR";
  var TG_NAME: string;
  var TG_WHEN: string;
  var TG_LEVEL: "ROW" | "STATEMENT";
  var TG_OP: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE";
  var TG_RELID: number;
  var TG_TABLE_NAME: string;
  var TG_TABLE_SCHEMA: string;
  var TG_ARGV: string[];
}

interface Plv8 {
  elog: (level: string, message: string) => void;
  prepare: <Result = any>(
    query: string,
    params: string[]
  ) => {
    execute: (params: any[]) => [Result];
  };
}
