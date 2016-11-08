odoo.define('web.kanban_tests', function (require) {
"use strict";

var KanbanView = require('web.KanbanView');
var test_utils = require('web.test_utils');
var test = require('web.test');

var render_view = test_utils.render_view;

test.define_suite('Kanban view', function(define_case) {

    define_case('basic ungrouped rendering', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test"><templates><t t-name="kanban-box">' +
                    '<div><field name="f1"/><field name="f7"/></div>' +
                '</t></templates></kanban>',
        });

        assert.true(kanban.$('.o_kanban_view').hasClass('o_kanban_ungrouped'),
                        "should have classname 'o_kanban_ungrouped'");
        assert.true(kanban.$('.o_kanban_view').hasClass('o_kanban_test'),
                        "should have classname 'o_kanban_test'");

        assert.equal(kanban.$('.o_kanban_record:not(.o_kanban_ghost)').length, 4,
                        "should have 4 records");
        assert.equal(kanban.$('.o_kanban_ghost').length, 6, "should have 6 ghosts");
        assert.equal(kanban.$('.o_kanban_record:contains(abcd1)').length, 1,
                        "should contain abcd1");
    });

    define_case('basic grouped rendering', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test">' +
                        '<field name="f3"/>' +
                        '<templates><t t-name="kanban-box">' +
                        '<div><field name="f1"/></div>' +
                    '</t></templates></kanban>',
            group_by: ['f3'],
        });

        assert.true(kanban.$('.o_kanban_view').hasClass('o_kanban_grouped'),
                        "should have classname 'o_kanban_grouped'");
        assert.true(kanban.$('.o_kanban_view').hasClass('o_kanban_test'),
                        "should have classname 'o_kanban_test'");
        assert.equal(kanban.$('.o_kanban_group').length, 2, "should have " + 2 + " columns");
        assert.equal(kanban.$('.o_kanban_group:nth-child(1) .o_kanban_record').length, 2,
                        "column should contain " + 2 + " record(s)");
        assert.equal(kanban.$('.o_kanban_group:nth-child(2) .o_kanban_record').length, 2,
                        "column should contain " + 2 + " record(s)");
    });

    define_case('pager, grouped', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test">' +
                        '<field name="f3"/>' +
                        '<templates><t t-name="kanban-box">' +
                        '<div><field name="f1"/></div>' +
                    '</t></templates></kanban>',
            group_by: ['f3'],
        });
        kanban.render_pager();

        assert.true(kanban.pager.$el.hasClass('o_hidden'),
                        "pager should be hidden in grouped kanban");
    });

    define_case('pager, ungrouped', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test">' +
                        '<field name="f3"/>' +
                        '<templates><t t-name="kanban-box">' +
                        '<div><field name="f1"/></div>' +
                    '</t></templates></kanban>',
            view_options: {
                limit: 10,
            },
        });
        kanban.render_pager();

        assert.true(!kanban.pager.$el.hasClass('o_hidden'),
                        "pager should be visible in ungrouped kanban");
        assert.equal(kanban.pager.state.limit, 10, "pager's limit should be 10");
        assert.equal(kanban.pager.state.size, 4, "pager's size should be 4");
    });

    define_case('create in grouped on m2o', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test" on_create="quick_create">' +
                        '<field name="f3"/>' +
                        '<templates><t t-name="kanban-box">' +
                            '<div><field name="f1"/></div>' +
                        '</t></templates>' +
                    '</kanban>',
            group_by: ['f3'],
        });
        kanban.render_buttons();

        assert.true(kanban.$buttons.find('.o-kanban-button-new').hasClass('btn-primary'),
            "'create' button should be btn-primary for grouped kanban with at least one column");
        assert.true(kanban.$('.o_kanban_view > div:last').hasClass('o_column_quick_create'),
            "column quick create should be enabled when grouped by a many2one field)");

        kanban.$buttons.find('.o-kanban-button-new').click(); // Click on 'Create'
        assert.true(kanban.$('.o_kanban_group:first() > div:nth(1)').hasClass('o_kanban_quick_create'),
            "clicking on create should open the quick_create in the first column");
    });

    define_case('create in grouped on char', function(assert) {
        var kanban = render_view({
            View: KanbanView,
            arch: '<kanban class="o_kanban_test" on_create="quick_create">' +
                        '<templates><t t-name="kanban-box">' +
                            '<div><field name="f1"/></div>' +
                        '</t></templates>' +
                    '</kanban>',
            group_by: ['f1'],
        });

        assert.equal(kanban.$('.o_kanban_group').length, 4, "should have " + 4 + " columns");
        assert.equal(kanban.$('.o_kanban_group:first() .o_column_title').text(), "Undefined",
            "'Undefined' column should be the first column");
        assert.true(!kanban.$('.o_kanban_view > div:last').hasClass('o_column_quick_create'),
            "column quick create should be disabled when not grouped by a many2one field)");
    });

});

});
