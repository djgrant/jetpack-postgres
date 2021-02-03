export interface Plv8 {
  elog: (level: string, message: string) => void;
  prepare: (
    query: string,
    params: string[]
  ) => {
    execute: (params: any[]) => any;
  };
}

export interface Action {
  type: string;
  task_id: string;
  snapshot: {};
}
