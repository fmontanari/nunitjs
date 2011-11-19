var assert = require("assert");

exports.setUp = function (setUp){

	//throw new Error("error setUp");
	
	setUp.done();
};

exports.tearDown = function (tearDown){
	//throw new Error("error tearDown");

	tearDown.done();
};

exports.testA = function (test){

	//throw new Error("error A");

//	setTimeout(function(){
//		throw new Error("unmanaged error!!!");
//	}, 500);

	test.done();
};

exports.testB = function (test){
	//test.setTimeout(5000);

	//throw new Error("error B");

	//assert.equal(1, 2, "failed");

	//assert.ok(false, "failed");
	test.done();
};

exports.testC = function (test){

	test.done();
};

exports.nonTest = function (){
    //this is not a test!!
};
