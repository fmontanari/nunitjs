NUnitJS
========

NUnitJS provides easy async unit testing for NodeJS. This framework was inspired by NUnit and NodeUnit.

* Simple to use
* Just run the single file script.
* Runs automatically all fixture modules with filename ends with "_fixture.js".
* Works with node.js.
* Helps you avoid common pitfalls when testing asynchronous code
* Easy to add test cases with setUp and tearDown functions if you wish
* Easy to add fixtureSetUp and fixtureTearDown functions if you wish

Usage
-----

Here is an example unit test fixture module:
sample_fixture.js

    var assert = require("assert");

    exports.testSomething = function(test){
        assert.ok(true, "this assertion should pass");
        test.done();
    };

    exports.testSomethingElse = function(test){
        assert.ok(false, "this assertion should fail");
        test.done();
    };

Here the command line to run:

    node nunit.js --path="sample_fixture.js"

When run, this will output the following:

  image


Arguments
-----------------

--path=[path],[path]

Path, folder or file, where to find fixture. Only file that ends with "_fixture.js" are executed.
Multiple Path are allowed with comma separated.

    node nunit.js --path=testfolder
    
    node nunit.js --path=folder1,folder2
    
    node nunit.js --path=sample1_fixture.js,sample2_fixture.js

--test=[test name]

Test function name to execute alone.

    node nunit.js --path=sample_fixture.js --test=testSomething

--delay=[Milliseconds]

delay to start tests. Used for debug mode on waiting for debug attached.

    node nunit.js --delay=1000

--verbose

print passed tests too

--version

print the current version