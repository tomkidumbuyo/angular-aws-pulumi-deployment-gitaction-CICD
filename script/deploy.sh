#!/bin/bash

yarn
yarn build:prod
cd pulumi
yarn
# pulumi up --skip-preview
pulumi up
cd ..
