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
    <a href="https://coveralls.io/github/benansell/lobo?branch=master">
        <img src="https://coveralls.io/repos/github/benansell/lobo/badge.svg?branch=master" alt="Coverage Status">
    </a>
</p>


<p align="center">
    <img height="750px" src="https://raw.github.com/benansell/lobo/master/docs/images/example-output.png">
</p>


## Features
* Support for [elm-test](http://package.elm-lang.org/packages/elm-community/elm-test/latest) and [lobo-elm-test-extra](http://package.elm-lang.org/packages/benansell/lobo-elm-test-extra/latest) 
test frameworks
* Default console reporter that displays a summary of the test run
* Watch mode that builds and runs the tests when the source code is 
updated 
* Checks elm.json for missing source directories and packages
* Friendly error output
* Test suite generation
* Test suite analysis that checks for hidden and over exposed tests


## Prerequisites
The installation guide assumes that you already have the following 
installed:
* [npm](https://docs.npmjs.com/)
* [elm](http://elm-lang.org/install) - v19.0 or greater

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

## lobo.json & .lobo directory
Once lobo has been run once you should find the "lobo.json" file and
the ".lobo" directory in the root of your project.

The lobo.json file is similar to the elm.json file with the additional
dependencies and source directories required to run lobo. This file is
created and managed automatically by lobo. In general you should not
edit this file by hand. It is recommended that you check this file into
your source control.

The .lobo directory only contains temp files for the running of lobo. You
should configure your source control to ignore this directory and its
contents.

## Upgrading
After updating lobo, you may find that elm does not properly find the 
lobo elm code. To fix this delete lobo.json, .lobo and elm-stuff.

### Versions of lobo prior to 0.5
Prior to 0.5 lobo did not generate the test suite and required you to
construct the test suites, which were typically linked together at a
central Tests.elm file. This is no longer required - you should be able
to remove most if not all of the describe tests in your project and
change each test module to expose everything.

## Tests
The recommended approach to writing tests is to expose all of the
tests automatically in the module through the use of "exposing (..)"

Lobo supports the following test frameworks:
* elm-test
* elm-test-extra

### elm-test
If you are using the elm-test framework your elm tests should be
similar to this:

```elm
module Tests exposing (..)

import Expect
import Test exposing (Test, test)

testExpectTrue : Test
testExpectTrue =
    test "Expect.true test" <|
        \() ->
            True
                |> Expect.true "Expected true"

testExpectNotEqual : Test
testExpectNotEqual =
    test "Expect Not Equal" <|
        \() ->
            Expect.notEqual "foo" "foobar"
...
```

### elm-test-extra
If you are using the elm-test-extra framework your elm tests should be
similar to this:

```elm
module Tests exposing (..)

import ElmTest.Extra exposing (Test, test)
import Expect

testExpectTrue : Test
testExpectTrue =
    test "Expect.true test" <|
        \() ->
            True
                |> Expect.true "Expected true"

testExpectNotEqual : Test
testExpectNotEqual =
    test "Expect Not Equal" <|
        \() ->
            Expect.notEqual "foo" "foobar"
...

```

The following elm-test functions are not available in elm-test-extra:
* concat -> instead use `describe`

Note: the use of skip in lobo requires a reason to be specified

## Analysis
Lobo considers any function that it finds in the test directory that
has no arguments and returns a Test to be a test that should be part of
the test suite. Using this definition lobo checks for the following
issues:
* Hidden Tests
* Over Exposed Tests

### Hidden Tests
These are tests that exist within the test files, but have not been
exposed by their module. The easiest way to avoid this issue is to
simply expose all of the types in the module by "exposing (..)".

### Over Exposed Tests
These are tests that are exposed directly or indirectly by more than
one test suite. This commonly occurs when using a describe block that
either is in a module that exposes all tests or including a test that
belongs to another module.

## Typical Workflow
Assuming your application follows the recommended directory structure 
for an elm application:
```
.lobo                 --> lobo temp directory - should be ignored by source control
elm.json              --> definition of the elm required packages
lobo.json             --> lobo configuration file
elm-stuff/            --> elm installed packages
node_modules/         --> npm installed modules
package.json          --> definition of the npm required packages
src/                  --> source code directory
tests/                --> test code directory
```

Locally running the following command will start lobo in watch mode:
```
lobo --watch 
```

Lobo will then check that the elm.json and lobo.json files are in-sync.
If they are out of sync it will ask you if the tests lobo.json can be
updated.

Lobo will then attempt to generate the test suite and build the tests,
if this fails the errors from elm make will be displayed

Once the build succeeds lobo will analyze the test suite for issues, if
this fails the issues will be displayed.

After the analysis is completed without any issues lobo will run the
test suite and report the result to the console.

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
The path to elm executable

### --debug
Disables auto-cleanup of temporary files. This can be useful when
debugging issues when combined with the verbose option

### --failOnOnly
Exit with non zero exit code when there are any only tests

### --failOnSkip
Exit with non zero exit code when there are any skip tests

### --failOnTodo
Exit with non zero exit code when there are any todo tests

### --framework
Specifies the test framework to use. The default is elm-test-extra. To
use elm-test use the following:
```
lobo --framework=elm-test
```

### --noAnalysis
Prevents lobo from running the test suite analysis. This can be useful
when the analysis is reporting false positives that cause the tests not
to run.

### --noInstall
Prevents lobo from trying to run elm install when running the tests.
This can be useful when using lobo without an internet connection.

### --noUpdate
Prevents lobo from trying to update the lobo.json file when running the
tests.

### --optimize (Experimental)
Attempts to build with the elm optimize flag. However, setting this flag
will be ignored if lobo finds usages of the Debug module in the elm.json
source directories.

Note: The optimizations performed by elm will prevent useful test
failure messages from being displayed.

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
elm.json source directories. If you change these you will need
to exit watch mode and restart it.

    
## Test Frameworks
The following test frameworks are supported:
* [elm-test-extra](http://package.elm-lang.org/packages/benansell/lobo-elm-test-extra/latest)
* [elm-test](http://package.elm-lang.org/packages/elm-explorations/test/latest)

### elm-test-extra
elm-test-extra is the default framework, it is similar to elm-test with
additions for running test.

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
* JSON reporter
* JUnit reporter

### Default Reporter
The default reporter displays a summary of the test run followed by
details of any failures. When the failure is from an Expect.equal
assertion it adds a visual hint for the source of the difference:

<p align="center">
    <img height="125px" src="https://raw.github.com/benansell/lobo/master/docs/images/default-reporter-diff-example.png" alt="difference highlight">
</p>
 
The following options are supported by the default reporter:
* hideDebugMessages - prevent reporting of any test Debug.log messages
* showSkip - report skipped tests and the reasons after the summary.
This option is only available with elm-test-extra and is ignored when
the quiet option is present
* showTodo - report skipped tests and the reasons after the summary.
This option is ignored when the quiet option is present

### JSON Reporter
The JSON reporter outputs the progress and run details as JSON. This
reporter is generally only useful when integrating lobo with other
tools.

The following options are supported by the JSON reporter:
* reportFile - save the output to the specified file

### JUnit Reporter
The JUnit reporter outputs progress and summary to the console and
details of the test run to the specified report file. This
reporter is mainly useful when integrating lobo with other build tools.

The following options are supported by the JUnit reporter:
* diffMaxLength - the max length of diffed failure messages; defaults to
150 characters
* junitFormat - the formatting applied to failure messages - text or
html; defaults to text
* reportFile - the path to save the test run report to

## Troubleshooting
In general if lobo quits abnormally try deleting lobo.json, .lobo and
elm-stuff.

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
