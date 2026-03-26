export interface EvalTask {
  repo: string;
  goal: string;
}

export const sampleEvalDataset: EvalTask[] = [
  {
    repo: "examples/node-backend",
    goal: "新增一个 REST endpoint 并补测试",
  },
  {
    repo: "examples/monorepo-sample",
    goal: "修复 failing tests 并更新类型定义",
  },
  {
    repo: "examples/python-package",
    goal: "重命名函数并修复引用",
  },
];
