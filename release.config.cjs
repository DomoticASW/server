var config = require('semantic-release-preconfigured-conventional-commits');
config.plugins.push(
    "@semantic-release/github",
    "@semantic-release/git",
    "@semantic-release/npm",
    "semantic-release-export-data"
)
module.exports = config
