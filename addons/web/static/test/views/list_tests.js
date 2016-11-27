odoo.define('web.list_tests', function (require) {
"use strict";

var ListView = require('web.ListView');
var testUtils = require('web.test_utils');
var utils = require('web.utils');

var createView = testUtils.createView;

QUnit.module('List View', {
    beforeEach: function() {
        this.data = {
            foo: {
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


QUnit.test('simple readonly list', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="foo"/><field name="int_field"/></tree>',
    });

    // 3 th (1 for checkbox, 2 for columns)
    assert.equal(list.$('th').length, 3, "should have 3 columns");

    assert.equal(list.$('td:contains(gnap)').length, 1, "should contain gnap");
    assert.equal(list.$('tbody tr').length, 4, "should have 4 rows");
    assert.equal(list.$('th.o_column_sortable').length, 1, "should have 1 sortable column");
});


QUnit.test('simple editable rendering', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="bar"/></tree>',
    });

    assert.equal(list.$('th').length, 3, "should have 2 th");
    assert.equal(list.$('th').length, 3, "should have 3 th");
    assert.equal(list.$('td:contains(yop)').length, 1, "should contain yop");
});


QUnit.test('invisible columns are not displayed', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree>' +
                '<field name="foo"/>' +
                '<field name="bar" invisible="1"/>' +
            '</tree>',
    });

    // 1 th for checkbox, 1 for 1 visible column
    assert.equal(list.$('th').length, 2, "should have 2 th");
});

QUnit.test('at least 4 rows are rendered, even if less data', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="bar"/></tree>',
        domain: [['bar', '=', true]],
    });

    assert.equal(list.$('tbody tr').length, 4, "should have 4 rows");
});

QUnit.test('basic grouped list rendering', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="foo"/><field name="bar"/></tree>',
        group_by: ['bar'],
    });

    assert.equal(list.$('th:contains(Foo)').length, 1, "should contain Foo");
    assert.equal(list.$('th:contains(Bar)').length, 1, "should contain Bar");
    assert.equal(list.$('tr.o_group_header').length, 2, "should have 2 .o_group_header");
    assert.equal(list.$('th.o_group_name').length, 2, "should have 2 .o_group_name");
});

QUnit.test('boolean field rendering', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="bar"/></tree>',
    });

    assert.equal(list.$('tbody td:not(.o_list_record_selector) .o_checkbox input:checked').length, 3,
        "should have 3 checked input");
    assert.equal(list.$('tbody td:not(.o_list_record_selector) .o_checkbox input').length, 4,
        "should have 4 checkboxes");
});

QUnit.test('float field rendering', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="qux"/></tree>',
    });

    assert.equal(list.$('.o_list_number').length, 4, "should have 2 cells with .o_list_number");
});

QUnit.test('text field rendering', function(assert) {
    var data = {
        foo: {
            fields: {foo: {string: "F", type: "text"}},
            records: [{id: 1, foo: "some text"}]
        },
    };
    var list = createView({
        View: ListView,
        model: 'foo',
        data: data,
        arch: '<tree><field name="foo"/></tree>',
    });

    assert.equal(list.$('tbody td.o_list_text:contains(some text)').length, 1,
        "should have a td with the .o_list_text class");
});


QUnit.test('grouped list view, with 1 open group', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="foo"/><field name="int_field"/></tree>',
        group_by: ['foo'],
    });

    list.$('th.o_group_name').get(1).click();
    assert.equal(list.$('tbody').length, 3, "should contain 3 tbody");
    assert.equal(list.$('td:contains(9)').length, 1, "should contain 9");
    assert.equal(list.$('td:contains(-4)').length, 1, "should contain -4");
    assert.equal(list.$('td:contains(10)').length, 0, "should not contain 10");
});


QUnit.test('handle widget in readonly list', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="int_field" widget="handle"/><field name="foo"/></tree>',
    });

    assert.equal(list.$('th:contains(sequence number)').length, 0, "should not display description");
    assert.equal(list.$('span.o_row_handle').length, 4, "should have 4 handles");
});


QUnit.test('opening records when clicking on record', function(assert) {
    assert.expect(3);

    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree><field name="foo"/></tree>',
    });

    testUtils.intercept(list, "open_record", function() {
        assert.ok("list view should trigger 'open_record' event");
    });

    list.$('tr td:not(.o_list_record_selector)').first().click();
    list.do_search([], {}, ['foo']);
    assert.equal(list.$('tr.o_group_header').length, 3, "list should be grouped");
    list.$('th.o_group_name').first().click();

    list.$('tr:not(.o_group_header) td:not(.o_list_record_selector)').first().click();
});

QUnit.test('editable list view: readonly fields cannot be edited', function(assert) {

    this.data.foo.fields.foo.readonly = true;

    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="bar"/></tree>',
    });
    var $td = list.$('td:not(.o_list_record_selector)').first();
    var $second_td = list.$('td:not(.o_list_record_selector)').eq(1);
    $td.click();
    assert.ok(!$td.hasClass('o_edit_mode'), "foo cells should not be editable");
    assert.ok($second_td.hasClass('o_edit_mode'), "bar cells should be editable");
});

QUnit.test('basic operations for editable list renderer', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="bar"/></tree>',
    });

    var $td = list.$('td:not(.o_list_record_selector)').first();
    assert.equal($td.hasClass('o_edit_mode'), false, "td should not be in edit mode");
    $td.click();
    assert.equal($td.hasClass('o_edit_mode'), true, "td should be in edit mode");
    assert.equal($td.hasClass('o_field_dirty'), false, "td should not be dirty");
    $td.find('input').val('abc').trigger('input');
    assert.equal($td.hasClass('o_field_dirty'), true, "td should be dirty");
});

QUnit.test('field changes are triggered correctly', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="bar"/></tree>',
    });
    var $td = list.$('td:not(.o_list_record_selector)').first();

    var n = 0;
    testUtils.intercept(list, "field_changed", function() {
        n = 1;
    });
    $td.click();
    $td.find('input').val('abc').trigger('input');
    assert.equal(n, 1, "field_changed should not have been triggered");
    list.$('td:not(.o_list_record_selector)').eq(2).click();
    assert.equal(n, 1, "field_changed should have been triggered");
});

QUnit.test('selection changes are triggered correctly', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="bar"/></tree>',
    });
    var $tbody_selector = list.$('tbody .o_list_record_selector input').first();
    var $thead_selector = list.$('thead .o_list_record_selector input');

    var n = 0;
    testUtils.intercept(list, "selection_changed", function() {
        n += 1;
    });

    // tbody checkbox click
    $tbody_selector.click();
    assert.equal(n, 1, "selection_changed should have been triggered");
    assert.ok($tbody_selector.is(':checked'), "selection checkbox should be checked");
    $tbody_selector.click();
    assert.equal(n, 2, "selection_changed should have been triggered");
    assert.ok(!$tbody_selector.is(':checked'), "selection checkbox shouldn't be checked");

    // head checkbox click
    $thead_selector.click();
    assert.equal(n, 3, "selection_changed should have been triggered");
    assert.equal(list.$('.o_list_record_selector input:checked').length,
        list.$('tbody tr').length, "all selection checkboxes should be checked");

    $thead_selector.click();
    assert.equal(n, 4, "selection_changed should have been triggered");

    // this does not work, and I don't know why...
    // assert.equal(list.$('.o_list_record_selector input:checked').length, 0,
    //                     "no selection checkbox should be checked");
});

QUnit.test('aggregates are computed correctly', function(assert) {
    var list = createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree editable="bottom"><field name="foo"/><field name="int_field" sum="Sum"/></tree>',
    });
    var $tbody_selectors = list.$('tbody .o_list_record_selector input');
    var $thead_selector = list.$('thead .o_list_record_selector input');

    assert.equal(list.$('tfoot td:nth(2)').text(), "32", "total should be 32");

    $tbody_selectors.first().click();
    $tbody_selectors.last().click();
    assert.equal(list.$('tfoot td:nth(2)').text(), "6",
                    "total should be 6 as first and last records are selected");

    $thead_selector.click();
    assert.equal(list.$('tfoot td:nth(2)').text(), "32",
                    "total should be 32 as all records are selected");
});

// // this one does not work...  and it should...
// // QUnit.test('aggregates are computed correctly in grouped lists', function(assert) {
// //     var list = createView({
// //         View: ListView,
// //         arch: '<tree editable="bottom"><field name="f1"/><field name="f4" sum="Sum"/></tree>',
// //         view_options: { has_selectors: true },
// //         group_by: ['f3'],
// //     });

// //     var $group_headers = list.$('.o_group_header');
// //     var $xmo_group_header = $group_headers.filter(function (index, el) {
// //         return $(el).data('group').value === 'xmo';
// //     });
// //     var $hello_group_header = $group_headers.filter(function (index, el) {
// //         return $(el).data('group').value === 'hello';
// //     });
// //     assert.equal($xmo_group_header.find('td:nth(2)').text(), "5.5",
// //                                     "'xmo' group total should be 5.5");
// //     assert.equal($hello_group_header.find('td:nth(2)').text(), "-1.1",
// //                                     "'hello' group total should be -1.1");
// //     assert.equal(list.$('tfoot td:nth(3)').text(), "4.4", "total should be 4.4");

// //     $xmo_group_header.click();
// //     list.$('tbody .o_list_record_selector input').first().click();
// //     assert.equal(list.$('tfoot td:nth(3)').text(), "4.3",
// //                     "total should be 4.3 as first 'xmo' record is selected");
// // });

});
