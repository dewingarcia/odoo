odoo.define('web.widget_tests', function (require) {
"use strict";

var core = require('web.core');
var QWeb = require('web.QWeb');
var utils = require('web.utils');
var Widget = require('web.Widget');

QUnit.module('Widget');

QUnit.test('proxy (String)', function (assert) {
    var W = Widget.extend({
        exec: function () {
            this.executed = true;
        }
    });
    var w = new W();
    var fn = w.proxy('exec');
    fn();
    assert.ok(w.executed, 'should execute the named method in the right context');
});

QUnit.test('proxy (String)(*args)', function (assert) {
    var W = Widget.extend({
        exec: function (arg) {
            this.executed = arg;
        }
    });
    var w = new W();
    var fn = w.proxy('exec');
    fn(42);
    assert.ok(w.executed, "should execute the named method in the right context");
    assert.equal(w.executed, 42, "should be passed the proxy's arguments");
});

QUnit.test('proxy (String), include', function (assert) {
    // the proxy function should handle methods being changed on the class
    // and should always proxy "by name", to the most recent one
    var W = Widget.extend({
        exec: function () {
            this.executed = 1;
        }
    });
    var w = new W();
    var fn = w.proxy('exec');
    W.include({
        exec: function () { this.executed = 2; }
    });

    fn();
    assert.equal(w.executed, 2, "should be lazily resolved");
});

QUnit.test('proxy (Function)', function (assert) {
    var w = new (Widget.extend({ }))();

    var fn = w.proxy(function () { this.executed = true; });
    fn();
    assert.ok(w.executed, "should set the function's context (like Function#bind)");
});

QUnit.test('proxy (Function)(*args)', function (assert) {
    var w = new (Widget.extend({ }))();

    var fn = w.proxy(function (arg) { this.executed = arg; });
    fn(42);
    assert.equal(w.executed, 42, "should be passed the proxy's arguments");
});



QUnit.test('renderElement, no template, default', function (assert) {
    var widget = new (Widget.extend({ }))();

    var $original = widget.$el;
    assert.ok($original, "should initially have a root element");

    widget.renderElement();

    assert.ok(widget.$el, "should have generated a root element");
    assert.ok($original !== widget.$el, "should have generated a new root element");
    assert.strictEqual(widget.$el, widget.$el, "should provide $el alias");
    assert.ok(widget.$el.is(widget.el), "should provide raw DOM alias");

    assert.equal(widget.el.nodeName, 'DIV', "should have generated the default element");
    assert.equal(widget.el.attributes.length, 0, "should not have generated any attribute");
    assert.ok(_.isEmpty(widget.$el.html(), "should not have generated any content"));
});

QUnit.test('no template, custom tag', function (assert) {

    var widget = new (Widget.extend({
        tagName: 'ul'
    }))();
    widget.renderElement();

    assert.equal(widget.el.nodeName, 'UL', "should have generated the custom element tag");
});

QUnit.test('no template, @id', function (assert) {
    var widget = new (Widget.extend({
        id: 'foo'
    }))();
    widget.renderElement();

    assert.equal(widget.el.attributes.length, 1, "should have one attribute");
    assert.equal(widget.$el.attr('id'), 'foo', "should have generated the id attribute");
    assert.equal(widget.el.id, 'foo', "should also be available via property");
});

QUnit.test('no template, @className', function (assert) {
    var widget = new (Widget.extend({
        className: 'oe_some_class'
    }))();
    widget.renderElement();

    assert.equal(widget.el.className, 'oe_some_class', "should have the right property");
    assert.equal(widget.$el.attr('class'), 'oe_some_class', "should have the right attribute");
});

QUnit.test('no template, bunch of attributes', function (assert) {
    var widget = new (Widget.extend({
        attributes: {
            'id': 'some_id',
            'class': 'some_class',
            'data-foo': 'data attribute',
            'clark': 'gable',
            'spoiler': // don't read the next line if you care about Harry Potter...
                    'snape kills dumbledore'
        }
    }))();
    widget.renderElement();

    assert.equal(widget.el.attributes.length, 5, "should have all the specified attributes");

    assert.equal(widget.el.id, 'some_id');
    assert.equal(widget.$el.attr('id'), 'some_id');

    assert.equal(widget.el.className, 'some_class');
    assert.equal(widget.$el.attr('class'), 'some_class');

    assert.equal(widget.$el.attr('data-foo'), 'data attribute');
    assert.equal(widget.$el.data('foo'), 'data attribute');

    assert.equal(widget.$el.attr('clark'), 'gable');
    assert.equal(widget.$el.attr('spoiler'), 'snape kills dumbledore');
});

QUnit.test('template', function (assert) {
    core.qweb.add_template(
        '<no>' +
            '<t t-name="test.widget.template">' +
                '<ol>' +
                    '<li t-foreach="5" t-as="counter" ' +
                        't-attf-class="class-#{counter}">' +
                        '<input/>' +
                        '<t t-esc="counter"/>' +
                    '</li>' +
                '</ol>' +
            '</t>' +
        '</no>'
    );

    var widget = new (Widget.extend({
        template: 'test.widget.template'
    }))();
    widget.renderElement();

    assert.equal(widget.el.nodeName, 'OL');
    assert.equal(widget.$el.children().length, 5);
    assert.equal(widget.el.textContent, '01234');
});

QUnit.test('repeated', function (assert) {
    assert.expect(4);
    var $fix = $( "#qunit-fixture");

    core.qweb.add_template(
        '<no>' +
            '<t t-name="test.widget.template">' +
                '<p><t t-esc="widget.value"/></p>' +
            '</t>' +
        '</no>'
    );
    var widget = new (Widget.extend({
        template: 'test.widget.template'
    }))();
    widget.value = 42;

    return widget.appendTo($fix)
        .done(function () {
            assert.equal($fix.find('p').text(), '42', "DOM fixture should contain initial value");
            assert.equal(widget.$el.text(), '42', "should set initial value");
            widget.value = 36;
            widget.renderElement();
            assert.equal($fix.find('p').text(), '36', "DOM fixture should use new value");
            assert.equal(widget.$el.text(), '36', "should set new value");
        });
});


QUnit.module('Widgets, with QWeb', {
    beforeEach: function() {
        this.oldQWeb = core.qweb;
        core.qweb = new QWeb();
        core.qweb.add_template(
            '<no>' +
                '<t t-name="test.widget.template">' +
                    '<ol>' +
                        '<li t-foreach="5" t-as="counter" ' +
                            't-attf-class="class-#{counter}">' +
                            '<input/>' +
                            '<t t-esc="counter"/>' +
                        '</li>' +
                    '</ol>' +
                '</t>' +
            '</no>'
        );
    },
    afterEach: function() {
        core.qweb = this.oldQWeb;
    },
});

QUnit.test('basic-alias', function (assert) {

    var widget = new (Widget.extend({
        template: 'test.widget.template'
    }))();
    widget.renderElement();

    assert.ok(widget.$('li:eq(3)').is(widget.$el.find('li:eq(3)')),
        "should do the same thing as calling find on the widget root");
});


QUnit.test('delegate', function (assert) {
    var a = [];
    var widget = new (Widget.extend({
        template: 'test.widget.template',
        events: {
            'click': function () {
                a[0] = true;
                assert.strictEqual(this, widget, "should trigger events in widget");
            },
            'click li.class-3': 'class3',
            'change input': function () { a[2] = true; }
        },
        class3: function () { a[1] = true; }
    }))();
    widget.renderElement();

    widget.$el.click();
    widget.$('li:eq(3)').click();
    widget.$('input:last').val('foo').change();

    for(var i=0; i<3; ++i) {
        assert.ok(a[i], "should pass test " + i);
    }
});

QUnit.test('undelegate', function (assert) {
    var clicked = false;
    var newclicked = false;

    var widget = new (Widget.extend({
        template: 'test.widget.template',
        events: { 'click li': function () { clicked = true; } }
    }))();

    widget.renderElement();
    widget.$el.on('click', 'li', function () { newclicked = true; });

    widget.$('li').click();
    assert.ok(clicked, "should trigger bound events");
    assert.ok(newclicked, "should trigger bound events");

    clicked = newclicked = false;
    widget.undelegateEvents();
    widget.$('li').click();
    assert.ok(!clicked, "undelegate should unbind events delegated");
    assert.ok(newclicked, "undelegate should only unbind events it created");
});

QUnit.module('Widget, and async stuff');

QUnit.test("alive(alive)", function (assert) {
    assert.expect(1);

    var widget = new (Widget.extend({}));

    return utils.async_when(widget.start())
        .then(function () { return widget.alive(utils.async_when()); })
        .then(function () { assert.ok(true); });
});

QUnit.test("alive(dead)", function (assert) {
    assert.expect(1);
    var widget = new (Widget.extend({}));

    return $.Deferred(function (d) {
        utils.async_when(widget.start())
        .then(function () {
            // destroy widget
            widget.destroy();
            var promise = utils.async_when();
            // leave time for alive() to do its stuff
            promise.then(function () {
                return utils.async_when();
            }).then(function () {
                assert.ok(true);
                d.resolve();
            });
            // ensure that widget.alive() refuses to resolve or reject
            return widget.alive(promise);
        }).always(function () {
            d.reject();
            assert.ok(false, "alive() should not terminate by default");
        })
    });
});

QUnit.test("alive(alive, true)", function (assert) {
    assert.expect(1);
    var widget = new (Widget.extend({}));
    return utils.async_when(widget.start())
    .then(function () { return widget.alive(utils.async_when(), true) })
    .then(function () { assert.ok(true); });
});

QUnit.test("alive(dead, true)", function (assert) {
    assert.expect(1);
    var done = assert.async();

    var widget = new (Widget.extend({}));

    utils.async_when(widget.start())
    .then(function () {
        // destroy widget
        widget.destroy();
        return widget.alive(utils.async_when(), true);
    }).then(function () {
        assert.ok(false, "alive(p, true) should fail its promise");
        done();
    }, function () {
        assert.ok(true, "alive(p, true) should fail its promise");
        done();
    });
});

});