nodeAsyncify = require('nodeAsyncify');

// the K combinator is a function which returns a constant value
function K(val) {
	return function () {
		return val;
	};
}


function toPredicate(bool) {
	return K(bool);
}

function toAsyncPredicate(predicate) {
	if (typeof predicate === 'boolean') {
		predicate = toPredicate(predicate);
	}
	return nodeAsyncK(pre)
}

throw new Error('NOT DONNEEEEE YETTTTTTTTTTTS')