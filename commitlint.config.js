const Configuration = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (commit) => commit.includes("[skip ci]")
  ]
};

export default Configuration;