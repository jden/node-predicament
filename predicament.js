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

var If = function (predicate, consequent) {
  if (!(this instanceof If)) {
    return new If(predicate, consequent);
  }
  var _cfg = this._cfg = {
    consequent: consequent,
    promise: when.defer()
  };

  _cfg.promise.then(function (val) {
    if (val && _cfg.consequent) {
      _cfg.consequent();
    } else if (_cfg.elseConsequent) {
      _cfg.elseConsequent();
    }
  });

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
  if (typeof criteria === 'function') {
    return asyncify(criteria);
  }
  return asyncify.constant(criteria);
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