odoo.define('web.kanban_tests', function (require) {
"use strict";

var KanbanView = require('web.KanbanView');
var testUtils = require('web.test_utils');

var createView = testUtils.createView;

QUnit.module('Kanban View', {
    beforeEach: function() {
        this.data = {
            partner: {
                fields: {
                    foo: {string: "Foo", type: "char"},
                    bar: {string: "Bar", type: "boolean"},
                    int_field: {string: "int_field", type: "integer", sortable: true},
                    qux: {string: "my float", type: "float"},
                },
                records: [
                    {id: 1, bar: true, foo: "yop", int_field: 10, qux: 0.4},
                    {id: 2, bar: true, foo: "blip", int_field: 9, qux: 13},
                    {id: 3, bar: true, foo: "gnap", int_field: 17, qux: -3},
                    {id: 4, bar: false, foo: "blip", int_field: -4, qux: 9},
                ]
            },
        };
    }
});


QUnit.test('basic ungrouped rendering', function(assert) {
    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test"><templates><t t-name="kanban-box">' +
                '<div><field name="foo"/><field name="bar"/></div>' +
            '</t></templates></kanban>',
    });

    assert.ok(kanban.$('.o_kanban_view').hasClass('o_kanban_ungrouped'),
                    "should have classname 'o_kanban_ungrouped'");
    assert.ok(kanban.$('.o_kanban_view').hasClass('o_kanban_test'),
                    "should have classname 'o_kanban_test'");

    assert.equal(kanban.$('.o_kanban_record:not(.o_kanban_ghost)').length, 4,
                    "should have 4 records");
    assert.equal(kanban.$('.o_kanban_ghost').length, 6, "should have 6 ghosts");
    assert.equal(kanban.$('.o_kanban_record:contains(gnap)').length, 1,
                    "should contain gnap");
});

QUnit.test('basic grouped rendering', function(assert) {
    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test">' +
                    '<field name="bar"/>' +
                    '<templates><t t-name="kanban-box">' +
                    '<div><field name="foo"/></div>' +
                '</t></templates></kanban>',
        group_by: ['bar'],
    });

    assert.ok(kanban.$('.o_kanban_view').hasClass('o_kanban_grouped'),
                    "should have classname 'o_kanban_grouped'");
    assert.ok(kanban.$('.o_kanban_view').hasClass('o_kanban_test'),
                    "should have classname 'o_kanban_test'");
    assert.equal(kanban.$('.o_kanban_group').length, 2, "should have " + 2 + " columns");
    assert.equal(kanban.$('.o_kanban_group:nth-child(1) .o_kanban_record').length, 1,
                    "column should contain " + 1 + " record(s)");
    assert.equal(kanban.$('.o_kanban_group:nth-child(2) .o_kanban_record').length, 3,
                    "column should contain " + 3 + " record(s)");
});

QUnit.test('pager should be hidden in grouped mode', function(assert) {
    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test">' +
                    '<field name="bar"/>' +
                    '<templates><t t-name="kanban-box">' +
                    '<div><field name="foo"/></div>' +
                '</t></templates></kanban>',
        group_by: ['bar'],
    });
    kanban.render_pager();

    assert.ok(kanban.pager.$el.hasClass('o_hidden'),
                    "pager should be hidden in grouped kanban");
});

QUnit.test('pager, ungrouped', function(assert) {
    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test">' +
                    '<field name="bar"/>' +
                    '<templates><t t-name="kanban-box">' +
                    '<div><field name="foo"/></div>' +
                '</t></templates></kanban>',
    });
    kanban.render_pager();

    assert.ok(!kanban.pager.$el.hasClass('o_hidden'),
                    "pager should be visible in ungrouped kanban");
    assert.equal(kanban.pager.state.size, 4, "pager's size should be 4");
});

QUnit.test('create in grouped on m2o', function(assert) {

    this.data.partner.fields.many_to_one = {
        string: "something_id",
        type: "many2one",
        relation: "something.whatever",
    };
    this.data.partner.records[0].many_to_one = [3, "hello"];
    this.data.partner.records[1].many_to_one = [5, "xmo"];
    this.data.partner.records[2].many_to_one = [5, "xmo"];
    this.data.partner.records[3].many_to_one = [3, "hello"];


    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test" on_create="quick_create">' +
                    '<field name="many_to_one"/>' +
                    '<templates><t t-name="kanban-box">' +
                        '<div><field name="foo"/></div>' +
                    '</t></templates>' +
                '</kanban>',
        group_by: ['many_to_one'],
    });
    kanban.render_buttons();

    assert.ok(kanban.$buttons.find('.o-kanban-button-new').hasClass('btn-primary'),
        "'create' button should be btn-primary for grouped kanban with at least one column");
    assert.ok(kanban.$('.o_kanban_view > div:last').hasClass('o_column_quick_create'),
        "column quick create should be enabled when grouped by a many2one field)");

    kanban.$buttons.find('.o-kanban-button-new').click(); // Click on 'Create'
    assert.ok(kanban.$('.o_kanban_group:first() > div:nth(1)').hasClass('o_kanban_quick_create'),
        "clicking on create should open the quick_create in the first column");
});

QUnit.test('create in grouped on char', function(assert) {
    var kanban = createView({
        View: KanbanView,
        model: 'partner',
        data: this.data,
        arch: '<kanban class="o_kanban_test" on_create="quick_create">' +
                    '<templates><t t-name="kanban-box">' +
                        '<div><field name="foo"/></div>' +
                    '</t></templates>' +
                '</kanban>',
        group_by: ['foo'],
    });

    assert.equal(kanban.$('.o_kanban_group').length, 3, "should have " + 3 + " columns");
    assert.equal(kanban.$('.o_kanban_group:first() .o_column_title').text(), "yop",
        "'yop' column should be the first column");
    assert.ok(!kanban.$('.o_kanban_view > div:last').hasClass('o_column_quick_create'),
        "column quick create should be disabled when not grouped by a many2one field)");
});


});
