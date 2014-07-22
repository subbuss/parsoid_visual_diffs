## Install/setup

* npm install
* Add $PWD/node_modules/phantomjs/bin to $PATH

## Commandline

bin/ has some commandline scripts to generating diffs

Either use the following scripts

    node bin/gen.screenshots.js --help
    node bin/diff.screenshots.js --help

OR this script

    node bin/gen.visual_diff.js --help

## Testreduce client

testreduce/ has client scripts and example config for mass testing
of visual diffs by getting titles from a testreduce server (either
from the Parsoid codebase or from the testreduce repo on github
once that is ready for use).

There is an example testreduce server settings file there as well.

## Diff server

Thin server for generating diffs to be used in combination with
testreduce server to look at diffs (since the server doesn't have
the actual images, just a numeric score).
