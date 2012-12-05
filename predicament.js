var asyncify = require('node-asyncify');
var when = require('when');
var async = require('async');

function toArray(arrLike) {
  return Array.prototype.slice.call(arrLike);
}

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
	return asyncify(predicate);
}

function errorFirstify(valueFirstCbReturningFn) {
  return asyncify.errorFirstify(valueFirstCbReturningFn);
}

var global = this;

var If = function (/* varies */) {
	var args = toArray(arguments);
	var predicate;
	var consequent;
	var partialArgs;
	if (args.length === 1 && typeof args[0] === 'object') {
		predicate = args[0].predicate;
		consequent = args[0].consequent;
		partialArgs = args[0].partialArgs;
	} else {
		predicate = args.shift(); // first
		consequent = args.pop(); // last
	  var partialArgs = args; // whatever's left
	}

  if (!(this instanceof If)) {
  	// TODO: be less hacky about instantiation / parameter overloads
    return new If({
    	predicate: predicate,
    	consequent: consequent,
    	partialArgs: partialArgs
    });
  }

	var _cfg = this._cfg = {
    consequent: consequent,
    promise: when.defer()
  };

  _cfg.promise.then(function (val) {
    if (val && _cfg.consequent) {
      _cfg.consequent();
    } else if (!val && _cfg.elseConsequent) {
      _cfg.elseConsequent();
    }
  });

  predicate = predicament.apply(global, [predicate].concat(partialArgs));

  process.nextTick(function () {
    predicate(function (err, val) {
      if (err) {
        _cfg.promise.reject(err);
      } else {
        _cfg.promise.resolve(val);
      }
    });
  });

};

If.prototype.Then = function (consequent) {
	var _cfg = this._cfg;
	_cfg.consequent = consequent;
	return this;
};

If.prototype.Else = function (elseConsequent) {
  var _cfg = this._cfg;
  _cfg.elseConsequent = elseConsequent;
  _cfg.promise.then(null, function (err) {
  if (_cfg.elseConsequent) {
      _cfg.elseConsequent(err);
    }
  });
  return this;
};

//////////
// predicate builder stuff
//


//
var predicament = function(criteria) {
  var predicate;
  if (typeof criteria !== 'function') {
  	if (criteria in predicament) {
  		predicate = predicament[criteria];
  	} else {
  		return asyncify.constant(criteria);
  	}
  } else {
  	predicate = criteria;
  }
	// it'd better be async-friendly already
	var partialArgs = toArray(arguments).slice(1);
	if (partialArgs.length === 0) {
		return predicate;
	}

	return function (cb) {
		predicate.apply(this, partialArgs.concat(cb));
	};
};

function ensureCombinant(combinant) {
  if (typeof combinant === 'function') return combinant;
  return asyncify.constant(!!combinant);
}

predicament.and = function() {
  var combinants = toArray(arguments);
  var cb = combinants.pop();
  combinants = combinants.map(ensureCombinant);

  async.forEachSeries(combinants, function (combinant, next) {
    combinant(function (err, val) {
      if (err) return cb(err);
      if (!val) return cb(null, false);
      next();
    });
  }, function () {
    cb(null, true);
  });
};

predicament.all = function() {
  var combinants = toArray(arguments);
  var cb = combinants.pop();
  combinants = combinants.map(ensureCombinant);
  var n = combinants.length;
  combinants.forEach(function (combinant) {
    combinant(resolve);
  });
  var resolved = false;
  function resolve(err, val) {
    if (resolved) return;
    if (err) {
      resolved = true;
      return cb(err);
    }
    if (!val) {
      resolved = true;
      return cb(null, false);
    }
    if (--n === 0) {
      resolved = true;
      return cb(null, true);
    }
  }
};

predicament.or = function () {
  var combinants = toArray(arguments);
  var cb = combinants.pop();
  combinants = combinants.map(ensureCombinant);

  async.forEachSeries(combinants, function (combinant, next) {
    combinant(function (err, val) {
      if (err) return cb(err);
      if (val) return cb(null, true);
      next();
    });
  }, function () {
    cb(null, false);
  });
};

predicament.any = function () {
  var combinants = toArray(arguments);
  var cb = combinants.pop();
  combinants = combinants.map(ensureCombinant);
  var n = combinants.length;
  combinants.forEach(function (combinant) {
    combinant(resolve);
  });
  var resolved = false;
  function resolve(err, val) {
    if (resolved) return;
    if (err) {
      resolved = true;
      return cb(err);
    }
    if (val) {
      resolved = true;
      return cb(null, true);
    }
    if (--n === 0) {
      resolved = true;
      return cb(null, false);
    }
  }
};
predicament.If = If;
predicament.toPredicate = toPredicate;
predicament.toAsyncPredicate = toAsyncPredicate;
predicament.errorFirstify = errorFirstify;
module.exports = predicament;