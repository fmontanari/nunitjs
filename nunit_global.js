
exports.globalSetUp = function(setUp){
	console.log("--------------> globalSetUp");
//	throw new Error("my error");

	setUp.done();

};

exports.globalTearDown = function(tearDown){
	console.log("--------------> globalTearDown");
	//throw new Error("my error");
	tearDown.done();
};
