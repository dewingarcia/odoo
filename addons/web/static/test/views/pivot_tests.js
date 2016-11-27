odoo.define('web.pivot_tests', function (require) {
"use strict";

var PivotView = require('web.PivotView');
var testUtils = require('web.test_utils');

var createView = testUtils.createView;

QUnit.module('Pivot View', {
    beforeEach: function() {
        this.data = {
            foo: {
                fields: {
                    foo: {string: "Foo", type: "integer"},
                    bar: {string: "bar", type: "boolean"},
                },
                records: [
                    {id: 1, foo: 12, bar: true},
                    {id: 2, foo: 1, bar: true},
                    {id: 3, foo: 17, bar: true},
                    {id: 4, foo: 2, bar: false},
                ]
            },
        };
    }
});

QUnit.test('simple pivot rendering', function(assert) {
    var pivot = createView({
        View: PivotView,
        model: "foo",
        data: this.data,
        arch: '<pivot string="Partners">' +
                    '<field name="foo" type="measure"/>' +
            '</pivot>',
    });

    assert.equal(pivot.$('td.o_pivot_cell_value:contains(32)').length, 1,
                "should contain a pivot cell with the sum of all records");
});


});
