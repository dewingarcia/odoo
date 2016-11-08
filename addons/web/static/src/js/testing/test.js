odoo.define('web.test', function (require) {
"use strict";

var session = require('web.session');

var suites = {};

function define_case(suite_name, case_name, fn) {
    suites[suite_name].push({
        name: case_name,
        fn: fn,
    });
}

function define_suite(name, suite) {
    if (name in suites) {
        console.error("Suite '" + name + "' already defined");
    } else {
        suites[name] = [];
        suite(define_case.bind(null, name));
    }
}

function run_case(name, fn) {
    var nbr_ok = 0;
    var results = [];
    var expected = null;

    function generic_assert(descr, bool, error_msg) {
        results.push({
            description: descr,
            result: bool ? 'ok' : 'ko',
            error_msg: bool ? '' : error_msg,
        });
        if (bool) {
            nbr_ok++;
        }
    }
    var assert = {
        equal: function(left, right, descr) {
            var error_msg = "" + left + " is not equal to " + right;
            generic_assert(descr, left === right, error_msg);
        },
        true: function(value, descr) {
            generic_assert(descr, value);
        },
        ok: function(descr) {
            generic_assert(descr, true);
        },
        expect: function(n) {
            expected = n;
        }
    };

    try {
        fn(assert);
    } catch (e) {
        results.push({
            description: e.name,
            result: 'ko',
            error_msg: e.message + e.stack
        });
    }
    return {
        expected: expected || results.length,
        nbr_ok: nbr_ok,
        results: results,
        name: name,
    };
}

function run_suite(name, suite) {
    var total = 0;
    var nbr_ok = 0;
    var case_results = _.map(suite, function(descr) {
        var result = run_case(descr.name, descr.fn);
        total += result.expected;
        nbr_ok += result.nbr_ok;
        return result;
    });
    var score = ' (' + nbr_ok + '/' + total + ')';
    if (nbr_ok === total) {
        console.groupCollapsed(name + score);
    } else {
        console.group(name + score);
    }
    _.each(case_results, function(result) {
        if (result.nbr_ok === result.expected) {
            console.groupCollapsed(result.nbr_ok + '/' + result.expected + ' ' + result.name);
        } else {
            console.group(result.nbr_ok + '/' + result.expected + ' ' + result.name);
        }
        result.results.forEach(function (r) {
            if (r.result === 'ok') {
                console.log('ok: ' + r.description);
            } else {
                console.error('ko: ' + r.description, r.error_msg);
            }
        });
        if (result.results.length !== result.expected) {
            console.error('Some assertions have not been run');
        }
        console.groupEnd();
    });
    console.groupEnd();
}

function run_suites() {
    _.each(suites, function(suite, name) {
        run_suite(name, suite);
    });
}


setTimeout(function() {
    run_suites();
}, 1500);

return session.is_bound.then(function() {
    return {
        define_suite: define_suite,

    };
});

});
