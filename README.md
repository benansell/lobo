<p align="center">
    <img height="200px" src="https://raw.github.com/benansell/lobo/master/docs/images/lobo-header-and-logo.png" alt="Lobo">
    <p align="center">elm unit test runner</p>
</p>
<p align="center">
    <a href="https://ci.appveyor.com/project/benansell/lobo/branch/master">
        <img src="https://ci.appveyor.com/api/projects/status/qc6uaygx48hqn1sh/branch/master?svg=true" alt="Build Status - appveyor">
    </a>
    <a href="https://travis-ci.org/benansell/lobo">
        <img src="https://travis-ci.org/benansell/lobo.svg?branch=master" alt="Build Status - travis">
    </a>
</p>
***

<p align="center">
    <img height="750px" src="https://raw.github.com/benansell/lobo/master/docs/images/example-output.png">
</p>
***

## Features
* Support for [elm-test](http://package.elm-lang.org/packages/elm-community/elm-test/latest) and [lobo-elm-test-extra](http://package.elm-lang.org/packages/benansell/lobo-elm-test-extra/latest) 
test frameworks
* Default console reporter that displays a summary of the test run
* Watch mode that builds and runs the tests when the source code is 
updated 
* Checks elm-package.json in base directory and test directory for 
missing source directories and packages
* Friendly error output


## Prerequisites
The installation guide assumes that you already have the following 
installed:
* [npm](https://docs.npmjs.com/)
* [elm](http://elm-lang.org/install) - v17.1 or greater

## Install
It is recommended to install lobo locally for your application and 
lobo-cli globally:
```
npm install lobo --save
npm install -g lobo-cli
```

Once they are installed you can run lobo via the following command:
```
lobo --help 
```

## Updating
After updating lobo, you may find that elm does not properly find the 
lobo elm code. To fix this delete your test elm-stuff directory.

## Tests.elm
So that lobo can find all your tests it assumes that you have a 
Tests.elm file that references all the tests that should be run.

lobo does not require an elm file containing a main function - this is 
provided for you in the lobo npm package.

### elm-test
If you are using the elm-test framework your Tests.elm file should look
like:

```elm
module Tests exposing (all)

import Test exposing (Test, describe)

all : Test
all =
    describe "Tests"
        [ anExampleTest
        , ...
        ]
```

### elm-test-extra
If you are using the elm-test-extra framework your Tests.elm file should
look like:

```elm
module Tests exposing (all)

import ElmTest.Extra exposing (Test, describe)

all : Test
all =
    describe "Tests"
        [ anExampleTest
        , ...
        ]
```

The following elm-test functions are not available in elm-test-extra:
* concat -> instead use `describe`
* filter -> instead use `skip`

## Typical Workflow
Assuming your application follows the recommended directory structure 
for an elm application:
```
elm-package.json      --> definition of the elm required packages
elm-stuff/            --> elm installed packages
node_modules/         --> npm installed modules
package.json          --> definition of the npm required packages
src/                  --> source code directory
tests/                --> test code directory
    elm-package.json  --> definition of the elm required packages for app & testing
    elm-stuff/        --> elm installed packages for app & testing
    Tests.elm         --> defines which tests are run by the test runner
```

Locally running the following command will start lobo in watch mode:
```
lobo --watch 
```

lobo will then check that the elm-package.json files in the application
directory and tests directory are in-sync. If they are out of sync it
will ask you if the tests elm-package.json can be updated.

lobo will then attempt to build the tests, if this fails the errors
from elm make will be displayed

Once the build succeeds lobo will run the tests referenced in Tests.elm
and report the result to the console.

Once a build/run loop has completed if lobo is running in watch mode 
(recommended) it will wait for changes in the source code and 
automatically repeat the build/run loop.

## Options
The list of options available can be obtained by running:
```
lobo --help
```

For example lobo can be run with elm-test by running:
```
lobo --framework=elm-test
```

### --compiler
The path to elm-package and elm-make

### --debug
Disables auto-cleanup of temporary files. This can be useful when
debugging issues when combined with the verbose option

### --framework
Specifies the test framework to use. The default is elm-test-extra. To
use elm-test use the following:
```
lobo --framework=elm-test
```
### --noUpdate
Prevents lobo from trying to update the elm-package.json file in tests 
directory. The default is to try and sync the elm-package.json files 
in the base and test directories.

### --noWarn
Hides elm make build warnings. The default is to show warning messages

### --prompt
Prevents lobo and elm tools asking your permission, and always answers
 "yes"

### --quiet
Minimise the output to build and test summary information and errors

### --reporter
The name of the reporter to use. Currently there is only one 
default-reporter

### --testDirectory
Specify the path to the tests directory. The default is "tests". This
is useful if you have a non standard directory setup and can be used as
follows:
```
lobo --testDirectory="test/unit"
```

### --verbose
Increases the verbosity of lobo logging messages. Please use this when
reporting an issue with lobo to get details about what lobo was trying
and failed todo.

### --veryVerbose
Increases the verbosity of lobo logging to be very detailed.

### --watch
Put lobo in a infinite loop that watches for changes and automatically
reruns the build and tests when the source code has changed.

Note: Currently watch mode does not deal with changes to the 
elm-package.json source directories. If you change these you will need
to exit watch mode and restart it.

    
## Test Frameworks
The following test frameworks are supported:
* [elm-test-extra](http://package.elm-lang.org/packages/benansell/lobo-elm-test-extra/latest)
* [elm-test](http://package.elm-lang.org/packages/elm-community/elm-test/latest)

### elm-test-extra
elm-test-extra is the default framework, it is similar to elm-test with
additions for focusing and skipping tests.

The following options are supported elm-test-extra:
* runCount - run count for fuzz tests; defaults to 100 
* seed - initial seed value for fuzz tests; defaults to a random value
    
### elm-test
To use elm-test lobo will need to be run with the framework option 
"elm-test" - see the options section for more information.

The following options are supported elm-test-extra:
* runCount - run count for fuzz tests; defaults to 100
* seed - initial seed value for fuzz tests; defaults to a random value

## Reporters
The following reporters are supported:
* default reporter

### Default Reporter
The default reporter displays a summary of the test run followed by
details of any failures. When the failure is from an Expect.equal
assertion it adds a visual hint for the source of the difference:

<p align="center">
    <img height="125px" src="https://raw.github.com/benansell/lobo/master/docs/images/default-reporter-diff-example.png" alt="difference highlight">
</p>
 
The following options are supported by the default reporter:
* failOnFocus - exit with non zero exit code when there are any focused 
tests
* showSkipped - report skipped tests and the reasons after the summary.
This option is ignored when the quiet option is present

## Troubleshooting

### The argument to function `findTests` is causing a mismatch
If you are seeing an error similar to the following:
```
The argument to function `findTests` is causing a mismatch.

15|                   ElmTestExtra.findTests Tests.all
                                             ^^^^^^^^^
Function `findTests` is expecting the argument to be:

    ElmTest.Runner.Test

But it is:

    Test.Internal.Test

Detected errors in 1 module.                  
```
Check that you have replaced all instances of `import Test` with 
`import ElmTest.Extra` 

### ReferenceError: _user$.....Plugin$findTests is not defined
If you are seeing an error similar to the following:
```
ReferenceError: _user$.....Plugin$findTests is not defined
```
Try deleting the test elm-stuff directory and re-running lobo

## Contributions
Contributions and suggestions welcome! In the first instance please raise 
an issue to against this project before starting work on a pull request.
