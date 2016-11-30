odoo.define('web.form_tests', function (require) {
"use strict";

var FormView = require('web.FormView');
var testUtils = require('web.test_utils');

var createView = testUtils.createView;

QUnit.module('Form View', {
    beforeEach: function() {
        this.data = {
            partner: {
                fields: {
                    display_name: { string: "Displayed name", type: "char" },
                    foo: {string: "Foo", type: "char"},
                    bar: {string: "Bar", type: "boolean"},
                    int_field: {string: "int_field", type: "integer", sortable: true},
                    qux: {string: "Qux", type: "float", digits: [16,1] },
                    p: {string: "one2many field", type: "one2many", relation: 'partner'},
                    trululu: {string: "Trululu", type: "many2one", relation: 'partner'},
                    timmy: { string: "pokemon", type: "many2many" },
                },
                records: [{
                    id: 1,
                    display_name: "first record",
                    bar: true,
                    foo: "yop",
                    int_field: 10,
                    qux: 0.44,
                    p: [],
                    timmy: [],
                    trululu: [4, "aaa"]
                }, {
                    id: 2,
                    display_name: "second record",
                    bar: true,
                    foo: "blip",
                    int_field: 9,
                    qux: 13,
                    p: [],
                    timmy: [],
                    trululu: [1, "bbb"]
                }]
            },
        };
    }
});


QUnit.test('simple form rendering', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<div class="test">some html<span>aa</span></div>' +
                '<sheet>' +
                    '<group>' +
                        '<group>' +
                            '<field name="foo"/>' +
                            '<field name="bar"/>' +
                            '<field name="int_field" string="f3_description"/>' +
                            '<field name="qux"/>' +
                        '</group>' +
                        '<group>' +
                            '<div class="hello"></div>' +
                        '</group>' +
                    '</group>' +
                    '<notebook>' +
                        '<page string="Partner Yo">' +
                            '<field name="p">' +
                                '<tree>' +
                                    '<field name="foo"/>' +
                                    '<field name="bar"/>' +
                                '</tree>' +
                            '</field>' +
                        '</page>' +
                    '</notebook>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });
    assert.equal(form.$('div.test').length, 1,
                    "should contain a div with some html");
    assert.equal(form.$('label:contains(Foo)').length, 1,
                    "should contain label Foo");
    assert.equal(form.$('span:contains(blip)').length, 1,
                    "should contain span with field value");

    assert.equal(form.$('label:contains(something_id)').length, 0,
                    "should not contain f3 string description");
    assert.equal(form.$('label:contains(f3_description)').length, 1,
                    "should contain custom f3 string description");
    assert.equal(form.$('div.o_field_one2many table').length, 1,
                    "should render a one2many relation");

    assert.equal(form.$('tbody td:not(.o_list_record_selector) .o_checkbox input:checked').length, 1,
                    "1 checkboxes should be checked");

    assert.equal(form.get('title'), "second record",
                    "title should be display_name of record");
    assert.equal(form.$('label.o_form_label_empty:contains(timmy)').length, 0,
                    "the many2many label shouldn't be marked as empty");
});

QUnit.test('group rendering', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('table.o_inner_group').length, 1,
                    "should contain an inner group");
});

QUnit.test('invisible fields are not rendered', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo" invisible="1"/>' +
                        '<field name="bar"/>' +
                    '</group>' +
                    '<field name="qux" invisible="1"/>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('label.o_form_invisible:contains(Foo)').length, 1,
                    "should not contain label Foo");
    assert.equal(form.$('span.o_form_invisible:contains(yop)').length, 1,
                    "should not contain span with field value");
    assert.equal(form.$('.o_form_field.o_form_invisible:contains(0.4)').length, 1,
                    "field qux should be invisible");
});

QUnit.test('invisible elements are properly hidden', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<group string="invgroup" invisible="1">' +
                            '<field name="foo"/>' +
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

QUnit.test('many2ones in form views', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="trululu"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('a.o_form_uri').length, 1,
                    "should contain a link");
});

QUnit.test('float fields use correct digit precision', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="qux"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('span.o_form_field_number:contains(0.4)').length, 1,
                        "should contain a number rounded to 1 decimal");
});

QUnit.test('rendering with one2many', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<notebook>' +
                        '<page string="Partner page">' +
                            '<field name="p"/>' +
                        '</page>' +
                    '</notebook>' +
                '</sheet>' +
            '</form>',
        res_id: 14,
    });

    assert.equal(form.$('td.o_list_record_selector').length, 0,
                    "embedded one2many should not have a selector");
});

QUnit.test('rendering stat buttons', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<div name="button_box">' +
                        '<button class="oe_stat_button">' +
                            '<field name="int_field"/>' +
                        '</button>' +
                        '<button class="oe_stat_button" modifiers=\'{"invisible": [["bar", "=", true]]}\'>' +
                            '<field name="bar"/>' +
                        '</button>' +
                    '</div>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });

    assert.equal(form.$('button.oe_stat_button').length, 2,
                    "should have 2 stat buttons");
    assert.equal(form.$('button.oe_stat_button.o_form_invisible').length, 1,
                    "should have 1 invisible stat buttons");

    var count = 0;
    testUtils.intercept(form, "execute_action", function() {
        count++;
    });
    form.$('.oe_stat_button').first().click();
    assert.equal(count, 1, "should have triggered a execute action");
});


QUnit.test('label uses the string attribute', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<label for="bar" string="customstring"/>' +
                        '<div><field name="bar"/></div>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });

    assert.equal(form.$('label.o_form_label:contains(customstring)').length, 1,
                    "should have 1 label with correct string");
});


QUnit.test('empty fields have o_form_empty class in readonly mode', function(assert) {
    this.data.partner.records[1].foo = false;  // 1 is record with id=2
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });

    assert.equal(form.$('span.o_form_field.o_form_field_empty').length, 1,
                        "should have 1 span with correct class");

    form.$buttons.find('.o_form_button_edit').click();
    assert.equal(form.$('.o_form_field_empty').length, 0,
                        "in edit mode, nothing should have .o_form_field_empty class");
    assert.equal(form.$('.o_form_label_empty').length, 0,
                        "in edit mode, nothing should have .o_form_field_empty class");
});


QUnit.test('email widget works correctly', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo" widget="email"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('a.o_form_uri.o_form_field.o_text_overflow').length, 1,
                    "should have a anchor with correct classes");
});

QUnit.test('url widget works correctly', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo" widget="url"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });

    assert.equal(form.$('a.o_form_uri.o_form_field.o_text_overflow').length, 1,
                    "should have a anchor with correct classes");
});


QUnit.test('many2one readonly fields with option "no_open"', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="trululu" options="{&quot;no_open&quot;: True}" />' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('a.o_form_uri').length, 0, "should not have an anchor");
});


QUnit.test('rendering with embedded one2many', function(assert) {
    this.data.partner.records[0].p = [2];
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<notebook>' +
                        '<page string="P page">' +
                            '<field name="p">' +
                                '<tree>' +
                                    '<field name="foo"/>' +
                                    '<field name="bar"/>' +
                                '</tree>' +
                            '</field>' +
                        '</page>' +
                    '</notebook>' +
                '</sheet>' +
        '</form>',
        res_id: 1,
    });

    assert.equal(form.$('th:contains(Foo)').length, 1,
        "embedded one2many should have a column titled according to foo");
    assert.equal(form.$('td:contains(blip)').length, 1,
        "embedded one2many should have a cell with relational value");
});


QUnit.test('embedded one2many with widget', function(assert) {
    this.data.partner.records[0].p = [2];
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch:'<form string="Partners">' +
                '<sheet>' +
                    '<notebook>' +
                        '<page string="P page">' +
                            '<field name="p">' +
                                '<tree>' +
                                    '<field name="int_field" widget="handle"/>' +
                                    '<field name="foo"/>' +
                                '</tree>' +
                            '</field>' +
                        '</page>' +
                    '</notebook>' +
                '</sheet>' +
        '</form>',
        res_id: 1,
    });

    assert.equal(form.$('span.o_row_handle').length, 1, "should have 1 handles");
});


QUnit.test('form view can switch to edit mode', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.mode, 'readonly', 'form view should be in readonly mode');
    assert.ok(form.$('.o_form_view').hasClass('o_form_readonly'),
                'form view should have .o_form_readonly');
    form.$buttons.find('.o_form_button_edit').click();
    assert.equal(form.mode, 'edit', 'form view should be in edit mode');
    assert.ok(form.$el.hasClass('o_form_editable'),
                'form view should have .o_form_editable');
    assert.ok(!form.$el.hasClass('o_form_readonly'),
                'form view should not have .o_form_readonly');
});

QUnit.test('char fields in edit mode', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    form.$buttons.find('.o_form_button_edit').click();
    assert.equal(form.$el.find('input[type="text"].o_form_input.o_form_field').length, 1,
                "should have an input for the char field foo");
});

QUnit.test('required fields should have o_form_required in readonly mode', function(assert) {
    this.data.partner.fields.foo.required = true;
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('span.o_form_required').length, 1,
                        "should have 1 span with o_form_required class");

    form.$buttons.find('.o_form_button_edit').click();
    assert.equal(form.$('input.o_form_required').length, 1,
                        "in edit mode, should have 1 input with o_form_required");
});

QUnit.test('many2one in edit mode', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<field name="trululu"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });
    form.to_edit_mode();
    var $dropdown = form.$('.o_form_field_many2one input').autocomplete('widget');

    form.$('.o_form_field_many2one input').click();
    assert.ok($dropdown.is(':visible'),
                'clicking on the m2o input should open the dropdown if it is not open yet');
    assert.equal($dropdown.find('li:not(.o_m2o_dropdown_option)').length, 2,
                'autocomplete should contains 2 suggestions');
    assert.equal($dropdown.find('li.o_m2o_dropdown_option').length, 1,
                'autocomplete should contain "Create and Edit..."');

    form.$('.o_form_field_many2one input').click();
    assert.ok(!$dropdown.is(':visible'),
                'clicking on the m2o input should close the dropdown if it is open');
});

QUnit.test('separators', function(assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<separator string="Geolocation"/>' +
                        '<field name="foo"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 1,
    });

    assert.equal(form.$('div.o_horizontal_separator').length, 1,
                    "should contain a separator div");
});

QUnit.test('buttons in form view', function (assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<sheet>' +
                    '<group>' +
                        '<button string="Geolocate" name="geo_localize" icon="fa-check" type="object"/>' +
                    '</group>' +
                '</sheet>' +
            '</form>',
        res_id: 2,
    });
    assert.equal(form.$('button.btn.btn-sm div.fa.fa-check').length, 1,
                    "should contain a button with correct content");

});


QUnit.test('change and save char', function (assert) {
    assert.expect(6);
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<group><field name="foo"/></group>' +
            '</form>',
        mockRPC: function(route, args) {
            if (args.method === 'write') {
                assert.ok(true, "should call the /write route");
            }
            return this._super(route, args);
        },
        res_id: 2,
    });

    assert.equal(form.mode, 'readonly', 'form view should be in readonly mode');
    assert.equal(form.$('span:contains(blip)').length, 1,
                    "should contain span with field value");

    form.$buttons.find('.o_form_button_edit').click();

    assert.equal(form.mode, 'edit', 'form view should be in edit mode');
    form.$('input').val("tralala").trigger('input');;
    form.$buttons.find('.o_form_button_save').click();

    assert.equal(form.mode, 'readonly', 'form view should be in readonly mode');
    assert.equal(form.$('span:contains(tralala)').length, 1,
                    "should contain span with field value");

});

QUnit.test('properly reload data from server', function (assert) {
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<group><field name="foo"/></group>' +
            '</form>',
        mockRPC: function(route, args) {
            if (args.method === 'write') {
                args.args[1].foo = "apple";
            }
            return this._super(route, args);
        },
        res_id: 2,
    });

    form.$buttons.find('.o_form_button_edit').click();
    form.$('input').val("tralala").trigger('input');;
    form.$buttons.find('.o_form_button_save').click();
    assert.equal(form.$('span:contains(apple)').length, 1,
                    "should contain span with field value");
});

QUnit.test('properly apply onchange in simple case', function (assert) {
    this.data.partner.onchanges = {
        foo: function(obj) {
            obj.int_field = obj.foo.length + 1000;
        },
    };
    var form = createView({
        View: FormView,
        model: 'partner',
        data: this.data,
        arch: '<form string="Partners">' +
                '<group><field name="foo"/><field name="int_field"/></group>' +
            '</form>',
        res_id: 2,
    });

    form.$buttons.find('.o_form_button_edit').click();

    assert.equal(form.$('input').eq(1).val(), 9,
                    "should contain input with initial value");

    form.$('input').first().val("tralala").trigger('input');

    assert.equal(form.$('input').eq(1).val(), 1007,
                    "should contain input with onchange applied");
});



});
