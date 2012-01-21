exports.version = 1.3;

/**
 * Author: Fabio Montanari
 * web: nunitjs.org
 */

process.chdir(__dirname);
var fs = require("fs");
var path = require("path");
var AssertionError = require('assert').AssertionError;

var currentContext = { disposed : true };

/********************** main ****************************/
exports.run = function (args) {
    var argumentParser = new ArgumentParser();
    var params = argumentParser.parse(args);

    var reporter = new Reporter(params["--verbose"]);
    reporter.version();

    if (params["--version"] !== undefined)
        return;

    process.on('uncaughtException', function (error) {
        if (currentContext.disposed){
            reporter.contextDone("uncaughtException", error);
            return;
        }

        currentContext.fail(error);
    });

    var runner = new Runner(reporter);

    var paths = extractPaths(params["--path"]);

    var fixtureFinder = new FixtureFinder();
    var fixtures = fixtureFinder.find(paths);

    var selectedTest = params["--test"];

    var delay = params["--delay"];

    if (!delay)
        delay = 0;

    var exitCode = -1;

    setTimeout(function(){

        runner.run(fixtures, selectedTest, function(totalResult){
            exitCode = totalResult.failed;
        });

    }, delay);

    process.on('exit', function () {
        process.exit(exitCode);
    });
};

/********************** argument parser ****************************/
function ArgumentParser() {
    this.parse = function (args) {
        var params = {};

        args.forEach(function(arg, index) {
            parseArg(arg, params);
        });

        return params;
    };

    function parseArg(arg, params) {

        var keyValues = arg.split("=");
        params[keyValues[0]] = keyValues[1] ? keyValues[1] : null;
    }
}

/********************** extract paths ****************************/
function extractPaths(pathParam) {
    if (!pathParam)
        return ["."];

    return pathParam.split(",");
}

/********************** fixture finder ****************************/
function FixtureFinder() {

    this.find = function(paths) {
        var fixtures = [];

        paths.forEach(function(path){
            findFixture(fixtures, path);
        });

        return fixtures;
    };

    function findFixture(fixtures, path) {

        var stats = fs.statSync(path);

        if (stats.isDirectory()) {
            findFixtureInDir(fixtures, path);
            return;
        }

        if (!strEndsWith(path, "_fixture.js")) {
            return;
        }

        fixtures.push(path);
    }

    function findFixtureInDir(fixtures, path) {
        var items = fs.readdirSync(path);

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemPath = path + "/" + item;
            findFixture(fixtures, itemPath);
        }
    }
}

/********************** runner ****************************/
function Runner(reporter) {
    var pathGlobal = "./nunit_global";
    var totalResult = new Result();

    this.run = function (fixtures, selectedTest, done) {

        var complete = function(){
            reporter.done(totalResult);
            done(totalResult);
        };

        runGlobalSetUp(complete, function(){
            runNextFixture(fixtures, selectedTest, function(){
                runGlobalTearDown(complete, function(){
                    complete();
                });
            });
        });
    };

    var runGlobalSetUp = function(done, callback){

        var globalModule;
        try{
            globalModule = require(pathGlobal);
        }catch(error){
            callback();
            return;
        }

        if (!globalModule.globalSetUp){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            globalModule.globalSetUp(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            totalResult.failed++;
            reporter.contextDone("globalSetUp", error);
            done();
        });

        context.start();
    };

    var runNextFixture = function (fixtures, selectedTest, done){

        if (fixtures.length == 0){
            done();
            return;
        }

        var fixture = fixtures.shift();

        var fixtureRunner = new FixtureRunner(reporter, fixture, selectedTest);

        fixtureRunner.run(function(result){
            totalResult.addResult(result);
            runNextFixture(fixtures, selectedTest, done);
        });
    };

    var runGlobalTearDown = function(done, callback){

        var globalModule;
        try{
            globalModule = require(pathGlobal);
        }catch(error){
            callback();
            return;
        }

        if (!globalModule.globalTearDown){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            globalModule.globalTearDown(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            totalResult.failed++;
            reporter.contextDone("globalTearDown", error);
            done();
        });

        context.start();
    };

}

/********************** Fixture Runner ****************************/
function FixtureRunner(reporter, fixture, selectedTest) {

    var result = new Result();
    var startDate;

    this.run = function(done) {

        startDate = new Date();
        reporter.fixtureStart(fixture);

        var fixtureDone = function(){
            result.duration = new Date() - startDate;
            reporter.fixtureDone(fixture, result);
            done(result);
        };

        var testModuleName = buildModuleName(fixture);
        var testModule = require(testModuleName);
        var testNames = getTestToExecute(testModule, selectedTest);

        runFixtureSetUp(testNames, testModule, fixtureDone, function(){
            runNextTest(testNames, testModule, function(){
                runFixtureTearDown(testNames, testModule, fixtureDone, function(){
                    fixtureDone();
                });
            });
        });
    };

    var runFixtureSetUp = function(testNames, testModule, fixtureDone, callback){

        if (!testModule.fixtureSetUp){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            testModule.fixtureSetUp(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            reporter.contextDone("fixtureSetUp", error);
            result.failed += testNames.length;
            result.total += testNames.length;
            fixtureDone();
        });

        context.start();
    };

    var runNextTest = function(testNames, testModule, callback){

        if (testNames.length == 0){
            callback();
            return;
        }

        result.total++;

        var testName = testNames.shift();

        var testRunner = new TestRunner(reporter, testModule, testName);
        testRunner.run(function(success){

            if (success)
                result.passed++;
            else
                result.failed++;

            runNextTest(testNames, testModule, callback);
        });
    };

    var runFixtureTearDown = function(testNames, testModule, fixtureDone, callback){

        if (!testModule.fixtureTearDown){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            testModule.fixtureTearDown(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            reporter.contextDone("fixtureTearDown", error);
            result.failed += testNames.length;
            result.total += testNames.length;
            fixtureDone();
        });

        context.start();
    };

    function buildModuleName(fixture) {
        var strModule = fixture;
        strModule = path.relative(__dirname, strModule);
        if (!strStartsWith(strModule, "..")) {
            strModule = "./" + strModule;
        }

        return strModule;
    }

    function getTestToExecute(module, selectedTest){
        var testNames = [];

        for (var key in module){
            if (!strStartsWith(key, "test")){
                continue;
            }

            if (selectedTest && key != selectedTest){
                continue;
            }

            testNames.push(key);
        }

        return testNames;
    }
}

/********************** Fixture Result ****************************/
function Result(){
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.duration = 0;

    this.addResult = function (result) {
        this.total += result.total;
        this.passed += result.passed;
        this.failed += result.failed;
        this.duration += result.duration;
    };
}

/********************** Test Runner ****************************/
function TestRunner(reporter, module, testName) {

    this.run = function(done){

        setUp(done, function(){
            runTest(done, function(){
                tearDown(done, function(){
                    done(true);
                });
            })
        });

    };

    function setUp(done, callback){

        if (!module.setUp){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            module.setUp(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            reporter.contextDone(testName + " ---> setUp", error);
            done(false);
        });

        context.start();
    }

    function runTest(done, callback){

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            module[testName](context);
        });

        context.onPassed(function(){
            reporter.contextDone(testName);
            callback();
        });

        context.onFailed(function(error){
            reporter.contextDone(testName, error);
            done(false);
        });

        context.start();
    }

    function tearDown(done, callback){

        if (!module.tearDown){
            callback();
            return;
        }

        var context = new Context();
        currentContext = context;

        context.onStart(function(){
            module.tearDown(context);
        });

        context.onPassed(function(){
            callback();
        });

        context.onFailed(function(error){
            reporter.contextDone(testName + " ---> tearDown", error);
            done(false);
        });

        context.start();
    }
}

/********************** Context ****************************/
function Context() {

    var self = this;
    this.disposed = false;
    this.timeoutId;

    this.setTimeout = function(timeout){

        clearTimeout(this.timeoutId);

        this.timeoutId = setTimeout(function(){
            self.fail(new Error("timeout " + timeout + " ms."));
        }, timeout);
    }

    this.startDelegate = function(){};
    this.onStart = function(delegate){
        this.startDelegate = delegate;
    };

    this.passedDelegate = function(){};
    this.onPassed = function(delegate){
        this.passedDelegate = delegate;
    };

    this.failedDelegate = function(){};
    this.onFailed = function(delegate){
        this.failedDelegate = delegate;
    };

    this.start = function () {
        this.setTimeout(1000);

        try {
            this.startDelegate();
        } catch(error) {
            this.fail(error);
        }
    };

    this.done = function () {
        if (this.disposed)
            return;

        this.dispose();
        this.passedDelegate();
    };

    this.fail = function (error) {
        if (this.disposed)
            return;

        this.dispose();
        this.failedDelegate(error);
    };

    this.dispose = function(){
        clearTimeout(this.timeoutId);
        this.disposed = true;
    };

}

/********************** reporter ****************************/
function Reporter(verbose) {

    this.version = function(){
        console.log('\n');
        console.log("## NUnitJS version: " + exports.version.toFixed(1));
        console.log("## Author: Fabio Montanari");
        console.log("## Web: nunitjs.org");
    }

    this.fixtureStart = function (fixture) {

        console.log('\n\n' + "------ Fixture start --------------------");
        console.log(fixture);
        console.log("-----------------------------------------" + '\n\n');

    };

    this.contextDone = function (name, error) {
        if (!error) {

            if (verbose !== undefined){
                console.log("\n>>>>> '" + name + "' Passed.");
            }
        }
        else {

            console.log("\n>>>>> '" + name + "' failed.");

            if (error instanceof AssertionError){
                console.log("    message: " + error.message);
                console.log("    actual: " + error.actual);
                console.log("    expected: " + error.expected);
                console.log("    operator: " + error.operator);
            }

            if (error.stack)
                console.log("    " + error.stack);
            else
                console.log("    " + error);
        }
    };

    this.fixtureDone = function (fixture, result) {

        console.log('\n\n' + "------ Fixture end ----------------------");
        console.log(result.total + ' tests, ' + result.passed + ' passed, ' + result.failed + ' failed, took ' + result.duration + 'ms.');
        console.log("-----------------------------------------");
    };

    this.done = function (result) {

        console.log('\n\n' + '========== Total: ' + result.total + ' tests, ' + result.passed + ' passed, ' + result.failed + ' failed, took ' + result.duration + 'ms.  ==========\n\n');
    };
}

/****************** utils *********************/
function strEndsWith(str, strEnd) {
    return (str.match(strEnd + "$") == strEnd);
}

function strStartsWith(str, strStart) {
    return (str.match("^" + strStart) == strStart);
}

/****************** entry point *********************/
if (module == require.main) {
    exports.run(process.argv);
}