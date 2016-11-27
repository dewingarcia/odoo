odoo.define('web.util_tests', function (require) {
"use strict";

var utils = require('web.utils');

QUnit.module('Utility functions');


QUnit.test('intersperse', function (assert) {
    var intersperse = utils.intersperse;

    assert.equal(intersperse("", []), "");
    assert.equal(intersperse("0", []), "0");
    assert.equal(intersperse("012", []), "012");
    assert.equal(intersperse("1", []), "1");
    assert.equal(intersperse("12", []), "12");
    assert.equal(intersperse("123", []), "123");
    assert.equal(intersperse("1234", []), "1234");
    assert.equal(intersperse("123456789", []), "123456789");
    assert.equal(intersperse("&ab%#@1", []), "&ab%#@1");

    assert.equal(intersperse("0", []), "0");
    assert.equal(intersperse("0", [1]), "0");
    assert.equal(intersperse("0", [2]), "0");
    assert.equal(intersperse("0", [200]), "0");

    assert.equal(intersperse("12345678", [0], '.'), '12345678');
    assert.equal(intersperse("", [1], '.'), '');
    assert.equal(intersperse("12345678", [1], '.'), '1234567.8');
    assert.equal(intersperse("12345678", [1], '.'), '1234567.8');
    assert.equal(intersperse("12345678", [2], '.'), '123456.78');
    assert.equal(intersperse("12345678", [2, 1], '.'), '12345.6.78');
    assert.equal(intersperse("12345678", [2, 0], '.'), '12.34.56.78');
    assert.equal(intersperse("12345678", [-1, 2], '.'), '12345678');
    assert.equal(intersperse("12345678", [2, -1], '.'), '123456.78');
    assert.equal(intersperse("12345678", [2, 0, 1], '.'), '12.34.56.78');
    assert.equal(intersperse("12345678", [2, 0, 0], '.'), '12.34.56.78');
    assert.equal(intersperse("12345678", [2, 0, -1], '.'), '12.34.56.78');
    assert.equal(intersperse("12345678", [3,3,3,3], '.'), '12.345.678');
    assert.equal(intersperse("12345678", [3,0], '.'), '12.345.678');
});

QUnit.test('mutex: simple scheduling', function (assert) {
    var m = new utils.Mutex();

    var def1 = $.Deferred(),
        def2 = $.Deferred();

    var p1 = m.exec(function () { return def1; });
    var p2 = m.exec(function () { return def2; });

    assert.equal(p1.state(), "pending");
    assert.equal(p2.state(), "pending");

    def1.resolve();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "pending");

    def2.resolve();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "resolved");
});

QUnit.test('mutex: simpleScheduling2', function (assert) {
    var m = new utils.Mutex();

    var def1 = $.Deferred(),
        def2 = $.Deferred();

    var p1 = m.exec(function() { return def1; });
    var p2 = m.exec(function() { return def2; });

    assert.equal(p1.state(), "pending");
    assert.equal(p2.state(), "pending");
    def2.resolve();

    assert.equal(p1.state(), "pending");
    assert.equal(p2.state(), "pending");

    def1.resolve();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "resolved");
});

QUnit.test('mutex: reject', function (assert) {
    var m = new utils.Mutex();

    var def1 = $.Deferred(),
        def2 = $.Deferred(),
        def3 = $.Deferred();

    var p1 = m.exec(function() {return def1;});
    var p2 = m.exec(function() {return def2;});
    var p3 = m.exec(function() {return def3;});

    assert.equal(p1.state(), "pending");
    assert.equal(p2.state(), "pending");
    assert.equal(p3.state(), "pending");

    def1.resolve();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "pending");
    assert.equal(p3.state(), "pending");

    def2.reject();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "rejected");
    assert.equal(p3.state(), "pending");

    def3.resolve();
    assert.equal(p1.state(), "resolved");
    assert.equal(p2.state(), "rejected");
    assert.equal(p3.state(), "resolved");
});

QUnit.test('DropMisordered: resolve all correctly ordered, sync', function (assert) {
    var dm = new utils.DropMisordered(),
        flag = false;

    var d1 = $.Deferred(),
        d2 = $.Deferred();

    var r1 = dm.add(d1),
        r2 = dm.add(d2);

    $.when(r1, r2).done(function () {
        flag = true;
    });

    d1.resolve();
    d2.resolve();

    assert.ok(flag);
});

QUnit.test("DropMisordered: don't resolve mis-ordered, sync", function (assert) {
    var dm = new utils.DropMisordered(),
        done1 = false,
        done2 = false,
        fail1 = false,
        fail2 = false;

    var d1 = $.Deferred(),
        d2 = $.Deferred();

    dm.add(d1).done(function () { done1 = true; })
                .fail(function () { fail1 = true; });
    dm.add(d2).done(function () { done2 = true; })
                .fail(function () { fail2 = true; });

    d2.resolve();
    d1.resolve();

    // d1 is in limbo
    assert.ok(!done1);
    assert.ok(!fail1);

    // d2 is resolved
    assert.ok(done2);
    assert.ok(!fail2);
});

QUnit.test('DropMisordered: fail mis-ordered flag, sync', function (assert) {
    var dm = new utils.DropMisordered(true),
        done1 = false,
        done2 = false,
        fail1 = false,
        fail2 = false;

    var d1 = $.Deferred(),
        d2 = $.Deferred();

    dm.add(d1).done(function () { done1 = true; })
                .fail(function () { fail1 = true; });
    dm.add(d2).done(function () { done2 = true; })
                .fail(function () { fail2 = true; });

    d2.resolve();
    d1.resolve();

    // d1 is in limbo
    assert.ok(!done1);
    assert.ok(fail1);

    // d2 is resolved
    assert.ok(done2);
    assert.ok(!fail2);

});

QUnit.test('DropMisordered: resolve all correctly ordered, async', function (assert) {
    var done = assert.async();
    assert.expect(1);

    var dm = new utils.DropMisordered();

    var d1 = $.Deferred(),
        d2 = $.Deferred();

    var r1 = dm.add(d1),
        r2 = dm.add(d2);

    setTimeout(function () { d1.resolve(); }, 50);
    setTimeout(function () { d2.resolve(); }, 100);

    $.when(r1, r2).done(function () {
        assert.ok(true);
        done();
    });
});

QUnit.test("DropMisordered: don't resolve mis-ordered, async", function (assert) {
    var done = assert.async();
    assert.expect(4);

    var dm = new utils.DropMisordered(),
        done1 = false, done2 = false,
        fail1 = false, fail2 = false;

    var d1 = $.Deferred(), 
        d2 = $.Deferred();
    
    dm.add(d1).done(function () { done1 = true; })
                .fail(function () { fail1 = true; });
    dm.add(d2).done(function () { done2 = true; })
                .fail(function () { fail2 = true; });

    setTimeout(function () { d1.resolve(); }, 100);
    setTimeout(function () { d2.resolve(); }, 50);

    setTimeout(function () {
        // d1 is in limbo
        assert.ok(!done1);
        assert.ok(!fail1);

        // d2 is resolved
        assert.ok(done2);
        assert.ok(!fail2);
        done();
    }, 150);
});

QUnit.test('DropMisordered: fail mis-ordered flag, async', function (assert) {
    var done = assert.async();
    assert.expect(4);

    var dm = new utils.DropMisordered(true),
        done1 = false, done2 = false,
        fail1 = false, fail2 = false;

    var d1 = $.Deferred(),
        d2 = $.Deferred();

    dm.add(d1).done(function () { done1 = true; })
                .fail(function () { fail1 = true; });
    dm.add(d2).done(function () { done2 = true; })
                .fail(function () { fail2 = true; });

    setTimeout(function () { d1.resolve(); }, 100);
    setTimeout(function () { d2.resolve(); }, 50);

    setTimeout(function () {
        // d1 is failed
        assert.ok(!done1);
        assert.ok(fail1);

        // d2 is resolved
        assert.ok(done2);
        assert.ok(!fail2);
        done();
    }, 150);
});


});