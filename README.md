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


Command-line arguments
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

Asynchronous Testing
--------------------

NUnitJS is designed to help you testing asynchronous code.
All context (test, setUp, tearDown, fixtureSetUp and fixtureTearDown) can explicity complete with done() method on context object:

Example 1: complete on same tick

    exports.testSomething = function(context){
        
        context.done();
    };

Example 2: complete on different tick

    exports.testSomething = function(context){
      
        setTimeout(function(){
        
            context.done();
        
        }, 500);
    };
    
Timeout
--------------------

if the done() method was never called, test failed on default timeout, 1000ms. You can change timeout if your test spends much time.

    exports.testSomething = function(context){
    
        context.setTimeout(2000);
      
        setTimeout(function(){
        
            context.done();
        
        }, 1500);
    };

setUp and tearDown
--------------------------

NUnitJS allows you to define a `setUp` function, which is run before each test, and a `tearDown` function, which is run after each test calls `test.done()`:
    
    exports.setUp = function (setUp) {
        this.foo = 'bar';
        setUp.done();
    };
    
    exports.tearDown = function (tearDown) {
        // clean up
        tearDown.done();
    };
    
    exports.test1 = function (test) {
        assert.equals(this.foo, 'bar');
        test.done();
    };


fixtureSetUp and fixtureTearDown
--------------------------

NUnitJS allows you to define a `fixtureSetUp` function, which is run before each fixture, and a `fixtureTearDown` function, which is run after each fixture completed.
    
    exports.fixtureSetUp = function (fixtureSetUp) {
        this.foo = 'bar';
        fixtureSetUp.done();
    };
    
    exports.fixtureTearDown = function (fixtureTearDown) {
        // clean up
        fixtureTearDown.done();
    };
    
    exports.test1 = function (test) {
        assert.equals(this.foo, 'bar');
        test.done();
    };
    

NUnitJS plugin for WebStorm
--------------------------

NUnitJS plugin provides easy integration with WebStorm IDE

* Simple to use.
* Easy access actions in toolbar, main menu and context menu.
* Runs and debug all tests.
* Runs and debug current fixture.
* Runs and debug fixture selected.
* Runs and debug multiple selection folders.
* Runs and debug current test.

http://github.com/fmontanari/NUnitJSPlugin

Donations
--------------------------
The Author invests a time and effort to make NUnitJS a useful tool. In addition, we have expenses. We have to purchase domain names and arrange for web site hosting.
Making a financial contribution is one way in which you can help him ensure that NUnitJS continues to develop.

[Donate with PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CW759SV2EXKYW)
