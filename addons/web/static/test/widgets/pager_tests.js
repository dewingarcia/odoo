odoo.define('web.pager_tests', function (require) {
"use strict";

var Pager = require('web.Pager');

QUnit.module('Pager');

QUnit.test('basic stuff', function(assert) {
    var pager = new Pager(null, 10, 1, 4);
    pager.appendTo($("<div>"));
    assert.equal(pager.state.current_min, 1, "current_min should be set to 1");
});

});