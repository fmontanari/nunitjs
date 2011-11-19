
exports.fixtureSetUp = function (fixtureSetUp){

	//throw new Error("fixture error");
	fixtureSetUp.done();
};

exports.fixtureTearDown = function (fixtureTearDown){

	//throw new Error("fixtureTearDown error");
	fixtureTearDown.done();
};

exports.setUp = function (setUp){

	//throw new Error("setUp error");
	setUp.done();
};

exports.tearDown = function (tearDown){

	//throw new Error("tearDown error");
	tearDown.done();
};

exports.testA = function (test){

	test.done();
};

exports.testB = function (test){
    
	test.done();
};
