# predicament
a predicate factory and normalizer

a predicate is a function that returns a boolean value describing some criteria. Consider:

	  if (isRegistered(user)) {
	    // do stuff
	  }

Here, `isRegistered` is a predicate which takes a `user` and returns `true` or `false`. They're super useful for abstracting and isolating business logic

Predicament helps you normalize these in ways node can use, converting between flags, synchronous predicates, and node-style async predicates.

## Installation

		$ npm install predicament

## Usage example

		var predicament = require('predicament');

		var debugMode = false;
		var checkUserIsAuthorized = function (user) {
				return Math.random() > .5;
		}

		var server = require('http').createServer(function (req, res) {
				predicament.If(
					predicament.or(
						predicament.toAsyncPredicate(debugMode),
						predicament.toAsyncPredicate(checkUserIsAuthorized)
					)
				).Else(function () {
					res.statusCode = 403;
					res.end('unauthorized');
				}
		})

If
Else

or - series, operand B is only evaluated if operand A is false
and - series, operand B is only evaluated if operand A is true
any - parallel, all operands are evaluated in parallel, and the operation is true whenever the first operand returns true, or false when all operands return false
all - parallel, all operands are evaluated in parallel, and the operation is false whenever the first operand returns false, or true when all operands return true

-----------------------------------------------------------
combinator | associativity    | flow     | boolean operator
-----------------------------------------------------------
or         | left-associative | serial   | or
any        | non-associative  | parallel | or
and        | left-associative | parallel | and
all        | non-associative  | parallel | and

		predicament.If(userLoggedIn('capn_blorg'),
			function () {
			console.log('hello his blorgness!')
		}).Else(function (err) {
			if (err) console.err('something borkt');
			console.log('wait a minute - you're not blog! guards! guards!)
		})

# License
MIT. (c) 2012 jden - Jason Denizac <jason@denizac.org>. http://jden.mit-license.org/2012