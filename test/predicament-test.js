var predicament = require('../predicament');
var assert = require('assert');
var eventually = require('node-asyncify');

assert.unreachable = function () {
  assert.fail(false, true, 'this code branch should not be reachable');
};

describe('predicament', function () {
// offers async-friendly If-Then-Else conditional branching

  it('calls the consequent if the predicate evaluates to true', function (done) {
    predicament.If(eventually.K(true), function () {
      done();
    });
  });

  it('calls the elseConsequent if the predicate evaluates to false', function (done) {
    predicament.If(eventually.K(false), function () {
      assert.unreachable();
    })
    .Else(function (err) {
      assert(!err, 'there should be no error');
      done();
    });
  });

  it('evaluates predicate value with loose equality - truthy', function (done) {
    predicament.If(eventually.K('truthy'), function () {
      done();
    })
    .Else(function () {
      assert.unreachable();
    });
  });

  it('evaluates predicate value with loose equality - falsey', function (done) {
    var falsey = '';
    assert(!falsey);
    predicament.If(eventually.K(falsey), function () {
      assert.unreachable();
    })
    .Else(function () {
      done();
    });
  });


  it('calls the elseConsequent with an error argument if an error was returned by the predicate', function (done) {
    predicament.If(eventually.error('fail'), function () {
      assert.unreachable();
    })
    .Else(function (err) {
      assert(err, 'there should be an error');
      assert(err.message === 'fail', 'the error should propagate');
      done();
    });
  });

});

describe('predicate builder', function () {
// builds async predicates for use with predicament.If

  describe('predicate', function () {
    it('turns a constant value of a variable into an async nullary constant predicate', function (done) {
      var isTrue = true,
          p = predicament(true);

      assert(typeof p === 'function');
      // p takes a callback
      p(function (err, bool) {
        assert(!err, 'err should be empty');
        assert(bool === true);
        done();
      });

    });

    it('turns a synchronous nullary predicate into an async nullary predicate', function (done) {
      var isTrue = function() {
        return true;
      };
      var p = predicament(isTrue);

      assert(typeof p === 'function');
      p(function (err, bool) {
        assert(!err, bool);
        assert(bool === true);
        done();
      });
    });
  });

  describe('predicament.and', function(done) {
    // serial, left-associative, boolean AND
    it('is serial, left-associative', function (done) {
      var firstReached = false;
      predicament.and(
        function (cb) {
          firstReached = true;
          cb(null, true);
        },
        eventually.K(true),
        function (err, bool) {
          assert(!err);
          assert(firstReached);
          assert(bool === true);
          done();
        }
      );
    });
    it('is serial and will not evaluate subsequent terms if earlier terms evaluate to false', function (done) {
      predicament.and(
        eventually.K(false),
        function (cb) {
          assert.unreachable();
        },
        function (err, bool) {
          assert(!err);
          assert(bool === false);
          done();
        });
    });
  });

  describe('predicament.all', function () {
    // parallel, non-associative, boolean AND
    it('evaluates the combinants in parallel', function (done) {
      var reached = {
        first: false,
        second: false,
        third: false
      };
      var start = new Date();
      predicament.all(
        function(cb) {
          reached.first = true;
          setTimeout(function () { cb(null, true); }, 30);
        },
        function(cb) {
          reached.second = true;
          setTimeout(function () { cb(null, true); }, 40);
        },
        function(cb) {
          reached.third = true;
          setTimeout(function () { cb(null, false); }, 20);
        },
        function (err, bool) {
          // all combinants should be called,
          assert(reached.first);
          assert(reached.second);
          assert(reached.third);
          // however,
          assert(bool === false);
          assert(new Date() - start < 30, '`all` should return false as soon as the first combinant evaluates to false');
          done();
        });
    });
  });

  describe('predicament.or', function () {
    // serial, left-associative, boolean OR
    it('is serial, left-associative', function (done) {
      var reached = {
        first: false,
        second: false
      };

      predicament.or(
        function (cb) {
          reached.first = true;
          cb(null, true);
        },
        function (cb) {
          assert.unreachable();
        },
        function (err, bool) {
          assert(reached.first);
          assert(bool === true);
          done();
        }
      );
    });

  });

  describe('predicament.any', function () {
    // parallel, non-associative, boolean OR
    it('evaluates the combinants in parallel', function (done) {
      var reached = {
        first: false,
        second: false,
        third: false
      };
      var start = new Date();
      predicament.any(
        function(cb) {
          reached.first = true;
          setTimeout(function () { cb(null, false); }, 30);
        },
        function(cb) {
          reached.second = true;
          setTimeout(function () { cb(null, false); }, 40);
        },
        function(cb) {
          reached.third = true;
          setTimeout(function () { cb(null, true); }, 20);
        },
        function (err, bool) {
          // all combinants should be called,
          assert(reached.first);
          assert(reached.second);
          assert(reached.third);
          // however,
          assert(new Date() - start < 30, '`any` should return true as soon as the first combinant evaluates to true');
          assert(bool === true);
          done();
        });
    });
  });

  describe ('predicate helpers', function () {
    describe('toPredicate', function () {
      it('turns a constant value into a nullary synchronous predicate', function (){
        var val = false;
        var p = predicament.toPredicate(val);
        assert(p() === false);
      });
    });
    describe('toAsyncPredicate', function () {
      it('turns a plain old predicate into a nullary asynchronous node-style (error-first) predicate', function (done) {
        var val = function () { return true; };
        var p = predicament.toAsyncPredicate(val);
        p(function (err, bool) {
          assert(!err);
          assert(bool === true);
          done();
        });
      });
      it('turns a constant value into a nullary asynchronous node-style (error-first) predicate', function (done) {
        var val = true;
        var p = predicament.toAsyncPredicate(val);
        p(function (err, bool) {
          assert(!err);
          assert(bool === true);
          done();
        });
      });
    });
    describe('errorFirstify', function () {
      it('turns a function with a return-first callback into an error-first callback', function (done) {
        var wtfNodeFs = function (cb) {
          cb(false);
        };

        var p = predicament.errorFirstify(wtfNodeFs);
        p(function (err, bool) {
          assert(!err);
          assert(bool === false);
          done();
        })
      })
    })
  });
});

/*
// possible api designs:

// combinators usable at top level,
// return a predicamentBuilder
predicament.Or(x, y, z).Then(foo).Else(bar)

// combinators as higher order functions return async predicates
predicament.If(
  predicament.Or(x, y, z),
  foo
  )
  .Else(bar)

// combinators as parameter to If
// expression trees as objects
predicament.If({or: [x,y,z]}, foo).Else(bar)

  {
    If: { any: [
        userIsPregnant,
        {or: [
          false,
          ]}
      ]},
    Then: consequent
    Else: elseConsequent
  }


})
*/
;