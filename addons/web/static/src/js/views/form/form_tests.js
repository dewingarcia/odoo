odoo.define('web.form_tests', function (require) {
"use strict";

var FormView = require('web.FormView');
var test_utils = require('web.test_utils');
var test = require('web.test');

var render_view = test_utils.render_view;

test.define_suite('Form view', function(define_case) {

    define_case('simple form rendering', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<div class="test">some html<span>aa</span></div>' +
                    '<sheet>' +
                        '<group>' +
                            '<group>' +
                                '<field name="f1"/>' +
                                '<field name="f2"/>' +
                                '<field name="f3" string="f3_description"/>' +
                                '<field name="f9"/>' +
                            '</group>' +
                            '<group>' +
                                '<div class="hello"></div>' +
                            '</group>' +
                        '</group>' +
                        '<notebook>' +
                            '<page string="f6 page">' +
                                '<field name="f6">' +
                                    '<tree>' +
                                        '<field name="f1"/>' +
                                        '<field name="f2"/>' +
                                    '</tree>' +
                                '</field>' +
                            '</page>' +
                        '</notebook>' +
                    '</sheet>' +
                '</form>',
            res_id: 12,
        });
        assert.equal(form.$('div.test').length, 1,
                        "should contain a div with some html");
        assert.equal(form.$('label:contains(CharField1)').length, 1,
                        "should contain label CharField");
        assert.equal(form.$('span:contains(bar)').length, 1,
                        "should contain span with field value");

        assert.equal(form.$('label:contains(something_id)').length, 0,
                        "should not contain f3 string description");
        assert.equal(form.$('label:contains(f3_description)').length, 1,
                        "should contain custom f3 string description");
        assert.equal(form.$('div.o_field_one2many table').length, 1,
                        "should render a one2many relation");

        assert.equal(form.$('tbody td:not(.o_list_record_selector) .o_checkbox input:checked').length, 1,
                        "1 checkboxes should be checked");

        assert.equal(form.get('title'), "think big systems",
                        "title should be display_name of record");
        assert.equal(form.$('label.o_form_label_empty:contains(timmy)').length, 0,
                        "the many2many label shouldn't be marked as empty");
    });

    define_case('group rendering', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 1,
        });

        assert.equal(form.$('table.o_inner_group').length, 1,
                        "should contain an inner group");
    });

    define_case('invisible fields are not rendered', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1" invisible="1"/>' +
                            '<field name="f2"/>' +
                        '</group>' +
                        '<field name="f3" invisible="1"/>' +
                    '</sheet>' +
                '</form>',
            res_id: 1,
        });

        assert.equal(form.$('label.o_form_invisible:contains(CharField1)').length, 1,
                        "should not contain label CharField");
        assert.equal(form.$('span.o_form_invisible:contains(abcd)').length, 1,
                        "should not contain span with field value");
        assert.equal(form.$('.o_form_field.o_form_invisible:contains(hello)').length, 1,
                        "field f3 should be invisible");
    });

    define_case('invisible elements are properly hidden', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<group string="invgroup" invisible="1">' +
                                '<field name="f1"/>' +
                            '</group>' +
                        '</group>' +
                        '<notebook>' +
                            '<page string="visible">' +
                            '</page>' +
                            '<page string="invisible" invisible="1">' +
                            '</page>' +
                        '</notebook>' +
                    '</sheet>' +
                '</form>',
            res_id: 1,
        });

        assert.equal(form.$('.o_notebook li.o_form_invisible a:contains(invisible)').length, 1,
                        "should not display tab invisible");
        assert.equal(form.$('table.o_inner_group.o_form_invisible td:contains(invgroup)').length, 1,
                        "should not display invisible groups");
    });

    define_case('many2ones in form views', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f3"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 1,
        });

        assert.equal(form.$('a.o_form_uri').length, 1,
                        "should contain a link");
    });

    define_case('float fields use correct digit precision', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f4"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('span.o_form_field_number:contains(1.2)').length, 1,
                            "should contain a number rounded to 1 decimal");
    });


    define_case('rendering with one2many', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<notebook>' +
                            '<page string="f6 page">' +
                                '<field name="f6"/>' +
                            '</page>' +
                        '</notebook>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('td.o_list_record_selector').length, 0,
                        "embedded one2many should not have a selector");
    });

    
    define_case('rendering stat buttons', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<div name="button_box">' +
                            '<button class="oe_stat_button">' +
                                '<field name="f8"/>' +
                            '</button>' +
                            '<button class="oe_stat_button" modifiers=\'{"invisible": [["f7", "=", 3]]}\'>' +
                                '<field name="f7"/>' +
                            '</button>' +
                        '</div>' +
                        '<group>' +
                            '<field name="f4"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('button.oe_stat_button').length, 2,
                        "should have 2 stat buttons");
        assert.equal(form.$('button.oe_stat_button.o_form_invisible').length, 1,
                        "should have 1 invisible stat buttons");

        var count = 0;
        test_utils.intercept(form, "execute_action", function() {
            count++;
        });
        form.$('.oe_stat_button').first().click();
        assert.equal(count, 1, "should have triggered a execute action");
    });


    define_case('label uses the string attribute', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<label for="f4" string="customstring"/>' +
                            '<div><field name="f4"/></div>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('label.o_form_label:contains(customstring)').length, 1,
                        "should have 1 label with correct string");
    });


    define_case('empty fields have o_form_empty class in readonly mode', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('span.o_form_field.o_form_field_empty').length, 1,
                            "should have 1 span with correct class");

        form.$buttons.find('.o_form_button_edit').click();
        assert.equal(form.$('.o_form_field_empty').length, 0,
                            "in edit mode, nothing should have .o_form_field_empty class");
        assert.equal(form.$('.o_form_label_empty').length, 0,
                            "in edit mode, nothing should have .o_form_field_empty class");
    });


    define_case('email widget works correctly', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1" widget="email"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('a.o_form_uri.o_form_field.o_text_overflow').length, 1,
                        "should have a anchor with correct classes");
    });

    define_case('url widget works correctly', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1" widget="url"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('a.o_form_uri.o_form_field.o_text_overflow').length, 1,
                        "should have a anchor with correct classes");
    });


    define_case('many2one readonly fields with option "no_open"', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f3" options="{&quot;no_open&quot;: True}" />' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 1,
        });

        assert.equal(form.$('a.o_form_uri').length, 0, "should not have an anchor");
    });


    define_case('rendering with embedded one2many', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<notebook>' +
                            '<page string="f6 page">' +
                                '<field name="f6">' +
                                    '<tree>' +
                                        '<field name="f1"/>' +
                                        '<field name="f4"/>' +
                                    '</tree>' +
                                '</field>' +
                            '</page>' +
                        '</notebook>' +
                    '</sheet>' +
            '</form>',
            res_id: 14,
        });

        assert.equal(form.$('th:contains(iamafloat)').length, 1,
            "embedded one2many should have a column titled according to f4");
    });


    define_case('embedded one2many with widget', function(assert) {
        var form = render_view({
            View: FormView,
            arch:'<form string="Partners">' +
                    '<sheet>' +
                        '<notebook>' +
                            '<page string="f6 page">' +
                                '<field name="f6">' +
                                    '<tree>' +
                                        '<field name="f7" widget="handle"/>' +
                                        '<field name="f4"/>' +
                                    '</tree>' +
                                '</field>' +
                            '</page>' +
                        '</notebook>' +
                    '</sheet>' +
            '</form>',
            res_id: 14,
        });

        assert.equal(form.$('span.o_row_handle').length, 3, "should have 3 handles");
    });

    define_case('form view can switch to edit mode', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f4"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.mode, 'readonly', 'form view should be in readonly mode');
        assert.true(form.$('.o_form_view').hasClass('o_form_readonly'),
                    'form view should have .o_form_readonly');
        form.$buttons.find('.o_form_button_edit').click();
        assert.equal(form.mode, 'edit', 'form view should be in edit mode');
        assert.true(form.$el.hasClass('o_form_editable'),
                    'form view should have .o_form_editable');
        assert.true(!form.$el.hasClass('o_form_readonly'),
                    'form view should not have .o_form_readonly');
    });

    define_case('char fields in edit mode', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        form.$buttons.find('.o_form_button_edit').click();
        assert.equal(form.$el.find('input[type="text"].o_form_input.o_form_field').length, 1,
                    "should have an input for the char field f1");
    });

    define_case('required fields should have o_form_required in readonly mode', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f1"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });

        assert.equal(form.$('span.o_form_required').length, 1,
                            "should have 1 span with o_form_required class");

        form.$buttons.find('.o_form_button_edit').click();
        assert.equal(form.$('input.o_form_required').length, 1,
                            "in edit mode, should have 1 input with o_form_required");
    });

    define_case('many2one in edit mode', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<field name="f3"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 14,
        });
        form.to_edit_mode();
        var $dropdown = form.$('.o_form_field_many2one input').autocomplete('widget');

        form.$('.o_form_field_many2one input').click();
        assert.true($dropdown.is(':visible'),
                    'clicking on the m2o input should open the dropdown if it is not open yet');
        assert.equal($dropdown.find('li:not(.o_m2o_dropdown_option)').length, 2,
                    'autocomplete should contains 2 suggestions');
        assert.equal($dropdown.find('li.o_m2o_dropdown_option').length, 1,
                    'autocomplete should contain "Create and Edit..."');

        form.$('.o_form_field_many2one input').click();
        assert.true(!$dropdown.is(':visible'),
                    'clicking on the m2o input should close the dropdown if it is open');
    });

    define_case('separators', function(assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<separator string="Geolocation"/>' +
                            '<field name="f1"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 12,
        });
        assert.equal(form.$('div.o_horizontal_separator').length, 1,
                        "should contain a separator div");
    });

    define_case('buttons in form view', function (assert) {
        var form = render_view({
            View: FormView,
            arch: '<form string="Partners">' +
                    '<sheet>' +
                        '<group>' +
                            '<button string="Geolocate" name="geo_localize" icon="fa-check" type="object"/>' +
                        '</group>' +
                    '</sheet>' +
                '</form>',
            res_id: 12,
        });
        assert.equal(form.$('button.btn.btn-sm div.fa.fa-check').length, 1,
                        "should contain a button with correct content");

    });
});


});
