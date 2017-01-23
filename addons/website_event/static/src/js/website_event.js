odoo.define("website_event.registration_form.instance", function (require) {
    "use strict";

    var base = require("web_editor.base");
    var EventRegistrationForm = require("website_event.website_event");

    return base.ready().then(function () {
        var instance = new EventRegistrationForm();
        return instance.appendTo($('#registration_form')).then(function () {
            return instance;
        });
    });
});

odoo.define('website_event.website_event', function (require) {

var ajax = require('web.ajax');
var Widget = require('web.Widget');

// Catch registration form event, because of JS for attendee details
return Widget.extend({
    start: function() {
        var self = this;
        var res = this._super.apply(this.arguments).then(function() {
            $('#registration_form .a-submit')
                .off('click')
                .removeClass('a-submit')
                .click(function (ev) {
                    self.on_click(ev);
                });
        });
        return res;
    },
    on_click: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var $form = $(ev.currentTarget).closest('form');
        var post = {};
        $("#registration_form select").each(function() {
            post[$(this).attr('name')] = $(this).val();
        });
        return ajax.jsonRpc($form.attr('action'), 'call', post).then(function (modal) {
            var $modal = $(modal);
            $modal.appendTo($form).modal();
            $modal.on('click', '.js_goto_event', function () {
                $modal.modal('hide');
            });
        });
    },
});
});
