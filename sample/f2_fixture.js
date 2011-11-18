var assert = require("assert");

exports.setUp = function (setUp){

	//throw new Error("error setUp");

//	console.log("******** f2 setUp");
	setUp.done();
};

exports.tearDown = function (tearDown){
	//throw new Error("error tearDown");

	//console.log("******** f2 tearDown");
	tearDown.done();
};

exports.testA = function (test){
    //console.log("******** f2 testA");

	//throw new Error("error A");

	//test.timeout = 2000;

//	setTimeout(function(){
//		throw new Error("erroreeeee non gestito!!!");
//	}, 500);

	test.done();
};

exports.testB = function (test){
    //console.log("-------> f2 testB");

	//throw "fabiooooooooooooo";

	//throw new Error("error B");

	//assert.equal(1, 2, "fallito");

	//assert.ok(false, "fallito");
	test.done();
};

exports.testC = function (test){
   // console.log("******** f2 testC");
	test.done();
};

exports.nonTest = function (){
    //console.log("******** f2 nonTest");
};
