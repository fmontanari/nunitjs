
exports.fixtureSetUp = function (context){
    console.log("******** fixtureSetuUp");
	//throw new Error("errore nella fixture");
	context.done();
};

exports.fixtureTearDown = function (context){
    console.log("******** fixtureTearDown");
	//throw new Error("errore nella fixture");
	context.done();
};

exports.setUp = function (context){
    console.log("******** setUp");
	//throw new Error("errore nella fixture");
	context.done();
};

exports.tearDown = function (context){
    console.log("******** tearDown");
	//throw new Error("errore nella fixture");
	context.done();
};

exports.testA = function (test){
    console.log("******** f3 testA");
	test.done();
};

exports.testB = function (test){
    console.log("******** f3 testB");
	test.done();
};
