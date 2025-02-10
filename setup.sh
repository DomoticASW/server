#!/bin/sh

PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)

cp ${PROJECT_ROOT}/hooks/* .git/hooks
