exports.version = 1.0;

/**
 * Author: Fabio Montanari
 * web: nunitjs.org
 */

process.chdir(__dirname);
var fs = require("fs");
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
			reporter.testDone("uncaughtException", error);
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
	if (delay){
		setTimeout(function(){
			runner.run(fixtures, selectedTest);
		}, delay);
		return;
	}

	runner.run(fixtures, selectedTest);
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

	var totalResult = new Result();

	this.run = function (fixtures, selectedTest) {

//		console.log("***** fixtures *****");
//		fixtures.forEach(function(fixture) {
//			console.log("fixture: " + fixture);
//		});
//		console.log("***** ******** *****");

		runNextFixture(fixtures, selectedTest);
	};

	var runNextFixture = function (fixtures, selectedTest){

		if (fixtures.length == 0){
			complete();
			return;
		}

		var fixture = fixtures.shift();

		var fixtureRunner = new FixtureRunner(reporter, fixture, selectedTest);

		fixtureRunner.run(function(result){
			totalResult.addResult(result);
			runNextFixture(fixtures, selectedTest);
		});
	};

	var complete = function(){
		reporter.done(totalResult);
		process.exit(totalResult.failed);
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
			reporter.testDone("fixtureSetUp", error);
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
			reporter.testDone("fixtureTearDown", error);
			result.failed += testNames.length;
			result.total += testNames.length;
			fixtureDone();
		});

		context.start();
	};

	function buildModuleName(fixture) {
		var strModule = fixture;
		if (strEndsWith(fixture, ".js")) {
			strModule = fixture.substr(0, fixture.length - 3);
		}

		if (!strStartsWith(fixture, "./") && !strStartsWith(fixture, "/")) {
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
			reporter.testDone(testName + " ---> setUp", error);
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
			reporter.testDone(testName);
			callback();
		});

		context.onFailed(function(error){
			reporter.testDone(testName, error);
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
			reporter.testDone(testName + " ---> tearDown", error);
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
	this.timeoutMs;
	Object.defineProperty(this, "timeout", {
		get : function () {
			return this.timeoutMs;
		},
		set : function (value) {
			this.timeoutMs = value;

			clearTimeout(this.timeoutId);

			this.timeoutId = setTimeout(function(){
				self.fail(new Error("timeout " + value + " ms."));
			}, value);
		}

	});

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
		this.timeout = 1000;

		try {
			this.startDelegate();
		} catch(error) {
			this.fail(error);
		}
	};

	this.done = function () {
		this.dispose();
		this.passedDelegate();
	};

	this.fail = function (error) {
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
		console.log('\n' + "NUnitJS version: " + exports.version.toFixed(1));
	}

	this.fixtureStart = function (fixture) {

		console.log('\n\n' + "------ Fixture start --------------------");
		console.log(fixture);
		console.log("-----------------------------------------" + '\n\n');
		
	};

	this.testDone = function (name, error) {
		if (!error) {

			if (verbose !== undefined){
				console.log("\n>> Test '" + name + "' Passed.");
			}
		}
		else {

			console.log("\n>> Test '" + name + "' failed.");

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
};

function strStartsWith(str, strStart) {
	return (str.match("^" + strStart) == strStart);
};

/****************** entry point *********************/
if (module == require.main) {
	exports.run(process.argv);
}
