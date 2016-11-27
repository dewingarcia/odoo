odoo.define('web.graph_tests', function (require) {
"use strict";

var GraphView = require('web.GraphView');
var testUtils = require('web.test_utils');
var utils = require('web.utils');

var createView = testUtils.createView;

QUnit.module('Graph View', {
    beforeEach: function() {
        this.data = {
            foo: {
                fields: { bar: {string: "bar", type: "boolean"}},
                records: [
                    {id: 1, bar: true},
                    {id: 2, bar: true},
                    {id: 3, bar: true},
                    {id: 4, bar: false},
                ]
            },
        };
    }
});

QUnit.test('simple graph rendering', function(assert) {
    var graph = createView({
        View: GraphView,
        model: "foo",
        data: this.data,
        arch: '<graph string="Partners">' +
                    '<field name="bar"/>' +
            '</graph>',
    });

    var done = assert.async();
    return utils.delay(0).then(function () {
        assert.equal(graph.$('div.o_graph_svg_container svg.nvd3-svg').length, 1,
                    "should contain a div with a svg element");

        assert.equal(graph.renderer.state.mode, "bar", "should be in bar chart mode by default");
        done();
    });
});


QUnit.test('default type attribute', function(assert) {
    var graph = createView({
        View: GraphView,
        model: "foo",
        data: this.data,
        arch: '<graph string="Partners" type="pie">' +
                    '<field name="bar"/>' +
            '</graph>',
    });
    assert.equal(graph.renderer.state.mode, "pie", "should be in pie chart mode by default");
});


QUnit.test('switching mode', function(assert) {
    var graph = createView({
        View: GraphView,
        model: "foo",
        data: this.data,
        arch: '<graph string="Partners" type="line">' +
                    '<field name="bar"/>' +
            '</graph>',
    });
    assert.equal(graph.renderer.state.mode, "line", "should be in line chart mode by default");
    graph.$buttons.find('button[data-mode="bar"]').click();
    assert.equal(graph.renderer.state.mode, "bar", "should be in bar chart mode by default");
});



});
