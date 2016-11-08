odoo.define('web.list_tests', function (require) {
"use strict";

var ListView = require('web.ListView');
var test_utils = require('web.test_utils');
var test = require('web.test');

var render_view = test_utils.render_view;


test.define_suite('List view', function(define_case) {

    define_case('simple readonly list', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/><field name="f2"/></tree>',
        });

        // 3 th (1 for checkbox, 2 for columns)
        assert.equal(list.$('th').length, 3, "should have 3 columns");

        assert.equal(list.$('td:contains(abcd)').length, 1, "should contain abcd");
        assert.equal(list.$('tbody tr').length, 4, "should have 4 rows");
        assert.equal(list.$('th.o_column_sortable').length, 1, "should have 1 sortable column");
    });


    define_case('simple editable rendering', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree editable="bottom"><field name="f1"/><field name="f2"/></tree>',
        });

        assert.equal(list.$('th').length, 3, "should have 2 th");
        assert.equal(list.$('th').length, 3, "should have 3 th");
        assert.equal(list.$('td:contains(abcd)').length, 1, "should contain abcd");
    });


    define_case('invisible columns are not displayed', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree>' +
                    '<field name="f1"/>' +
                    '<field name="f2" invisible="1"/>' +
                '</tree>',
        });

        // 1 th for checkbox, 1 for 1 visible column
        assert.equal(list.$('th').length, 2, "should have 2 th");
    });

    define_case('at least 4 rows are rendered, even if less data', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/></tree>',
            domain: [['f2', '=', true]],
        });

        assert.equal(list.$('tbody tr').length, 4, "should have 4 rows");
    });

    define_case('basic grouped list rendering', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/><field name="f2"/></tree>',
            group_by: ['f3'],
        });

        assert.equal(list.$('th:contains(hello)').length, 1, "should contain abc");
        assert.equal(list.$('th:contains(xmo)').length, 1, "should contain def");
        assert.equal(list.$('tr.o_group_header').length, 2, "should have 2 .o_group_header");
        assert.equal(list.$('th.o_group_name').length, 2, "should have 2 .o_group_name");
    });

    define_case('boolean field rendering', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/><field name="f2"/></tree>',
        });

        assert.equal(list.$('tbody td:not(.o_list_record_selector) .o_checkbox input:checked').length, 2,
            "should have 2 checked input");
        assert.equal(list.$('tbody td:not(.o_list_record_selector) .o_checkbox input').length, 4,
            "should have 4 checkboxes");
    });

    define_case('float field rendering', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f4"/></tree>',
        });

        assert.equal(list.$('.o_list_number').length, 4, "should have 4 cells with .o_list_number");
    });

    define_case('text field rendering', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f5"/><field name="f2"/></tree>',
        });

        assert.equal(list.$('tbody td.o_list_text:contains(asdf)').length, 1,
            "should have a td with the .o_list_text class");
    });


    define_case('grouped list view, with 1 open group', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/><field name="f2"/></tree>',
            group_by: ['f3'],
        });

        list.$('th.o_group_name').first().click();
        assert.equal(list.$('tbody').length, 3, "should contain 3 tbody");
        assert.equal(list.$('td:contains(abcd)').length, 1, "should contain abcd");
        assert.equal(list.$('td:contains(blip)').length, 1, "should contain blip");
        assert.equal(list.$('th:contains(hello)').length, 1, "should have 1 th with hello");
    });


    define_case('handle widget in readonly list', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f7" widget="handle"/><field name="f2"/></tree>',
        });

        assert.equal(list.$('th:contains(sequence number)').length, 0, "should not display description");
        assert.equal(list.$('span.o_row_handle').length, 4, "should have 4 handles");
    });


    define_case('opening records when clicking on record', function(assert) {
        assert.expect(3);

        var list = render_view({
            View: ListView,
            arch: '<tree><field name="f1"/><field name="f2"/></tree>',
        });

        test_utils.intercept(list, "open_record", function() {
            assert.ok("list view should trigger 'open_record' event");
        });

        list.$('tr td:not(.o_list_record_selector)').first().click();
        list.do_search([], {}, ['f3']);
        assert.equal(list.$('tr.o_group_header').length, 2, "list should be grouped");
        list.$('th.o_group_name').first().click();

        list.$('tr:not(.o_group_header) td:not(.o_list_record_selector)').first().click();
    });

    define_case('editable list view: readonly fields cannot be edited', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree editable="bottom"><field name="f1"/><field name="f2"/></tree>',
            with_modifiers: { 'f1': {readonly: true}},
        });
        var $td = list.$('td:not(.o_list_record_selector)').first();
        var $second_td = list.$('td:not(.o_list_record_selector)').eq(1);
        $td.click();
        assert.true(!$td.hasClass('o_edit_mode'), "f1 cells should not be editable");
        assert.true($second_td.hasClass('o_edit_mode'), "f2 cells should be editable");
    });

    define_case('basic operations for editable list renderer', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree editable="bottom"><field name="f1"/><field name="f2"/></tree>',
        });

        var $td = list.$('td:not(.o_list_record_selector)').first();
        assert.equal($td.hasClass('o_edit_mode'), false, "td should not be in edit mode");
        $td.click();
        assert.equal($td.hasClass('o_edit_mode'), true, "td should be in edit mode");
        assert.equal($td.hasClass('o_field_dirty'), false, "td should not be dirty");
        $td.find('input').val('abc').trigger('input');
        assert.equal($td.hasClass('o_field_dirty'), true, "td should be dirty");
    });

    define_case('field changes are triggered correctly', function(assert) {
        var list = render_view({
            View: ListView,
            arch: '<tree editable="bottom"><field name="f1"/><field name="f2"/></tree>',
        });
        var $td = list.$('td:not(.o_list_record_selector)').first();

        var n = 0;
        test_utils.intercept(list, "field_changed", function() {
            n = 1;
        });
        $td.click();
        $td.find('input').val('abc').trigger('input');
        assert.equal(n, 1, "field_changed should not have been triggered");
        list.$('td:not(.o_list_record_selector)').eq(2).click();
        assert.equal(n, 1, "field_changed should have been triggered");
    });

    // define_case('selection changes are triggered correctly', function(assert) {
    //     var list = render_view({
    //         View: ListView,
    //         arch: '<tree editable="bottom"><field name="f1"/><field name="f2"/></tree>',
    //         view_options: { has_selectors: true },
    //     });
    //     var $tbody_selector = list.$('tbody .o_list_record_selector input').first();
    //     var $thead_selector = list.$('thead .o_list_record_selector input');

    //     var n = 0;
    //     test_utils.intercept(list, "selection_changed", function() {
    //         n += 1;
    //     });

    //     // tbody checkbox click
    //     $tbody_selector.click();
    //     assert.equal(n, 1, "selection_changed should have been triggered");
    //     assert.true($tbody_selector.is(':checked'), "selection checkbox should be checked");
    //     $tbody_selector.click();
    //     assert.equal(n, 2, "selection_changed should have been triggered");
    //     assert.true(!$tbody_selector.is(':checked'), "selection checkbox shouldn't be checked");

    //     // head checkbox click
    //     $thead_selector.click();
    //     assert.equal(n, 3, "selection_changed should have been triggered");
    //     assert.equal(list.$('.o_list_record_selector input:checked').length,
    //         list.$('tbody tr').length + 1, "all selection checkboxes should be checked");
    //     $thead_selector.click();
    //     assert.equal(n, 4, "selection_changed should have been triggered");
    //     assert.equal(list.$('.o_list_record_selector input:checked').length, 0,
    //                             "no selection checkbox should be checked");
    // });

    // define_case('aggregates are computed correctly', function(assert) {
    //     var list = render_view({
    //         View: ListView,
    //         arch: '<tree editable="bottom"><field name="f1"/><field name="f4" sum="Sum"/></tree>',
    //         view_options: { has_selectors: true },
    //     });
    //     var $tbody_selectors = list.$('tbody .o_list_record_selector input');
    //     var $thead_selector = list.$('thead .o_list_record_selector input');

    //     assert.equal(list.$('tfoot td:nth(2)').text(), "4.4", "total should be 4.4");

    //     $tbody_selectors.first().click();
    //     $tbody_selectors.last().click();
    //     assert.equal(list.$('tfoot td:nth(2)').text(), "-1.1",
    //                     "total should be -1.1 as first and last records are selected");

    //     $thead_selector.click();
    //     assert.equal(list.$('tfoot td:nth(2)').text(), "4.4",
    //                     "total should be 4.4 as all records are selected");
    // });

    // define_case('aggregates are computed correctly in grouped lists', function(assert) {
    //     var list = render_view({
    //         View: ListView,
    //         arch: '<tree editable="bottom"><field name="f1"/><field name="f4" sum="Sum"/></tree>',
    //         view_options: { has_selectors: true },
    //         group_by: ['f3'],
    //     });

    //     var $group_headers = list.$('.o_group_header');
    //     var $xmo_group_header = $group_headers.filter(function (index, el) {
    //         return $(el).data('group').value === 'xmo';
    //     });
    //     var $hello_group_header = $group_headers.filter(function (index, el) {
    //         return $(el).data('group').value === 'hello';
    //     });
    //     assert.equal($xmo_group_header.find('td:nth(2)').text(), "5.5",
    //                                     "'xmo' group total should be 5.5");
    //     assert.equal($hello_group_header.find('td:nth(2)').text(), "-1.1",
    //                                     "'hello' group total should be -1.1");
    //     assert.equal(list.$('tfoot td:nth(3)').text(), "4.4", "total should be 4.4");

    //     $xmo_group_header.click();
    //     list.$('tbody .o_list_record_selector input').first().click();
    //     assert.equal(list.$('tfoot td:nth(3)').text(), "4.3",
    //                     "total should be 4.3 as first 'xmo' record is selected");
    // });
});

});
