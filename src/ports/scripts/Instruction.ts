export interface Instruction {
  execute(env: ExecutionEnvironment): ExecutionEnvironment
}

type ExecutionEnvironment = undefined
