odoo.define('website_mail_channel.editor', function (require) {
'use strict';

var core = require('web.core');
var Model = require('web.Model');
var webEditorContext = require("web_editor.context");
var options = require('web_editor.snippets.options');
var wUtils = require('website.utils');

var _t = core._t;

options.registry.subscribe = options.Class.extend({
    select_mailing_list: function (type, value) {
        var self = this;
        if (type !== "click") return;
        return wUtils.prompt({
            id: "editor_new_subscribe_button",
            window_title: _t("Add a Subscribe Button"),
            select: _t("Discussion List"),
            init: function (field) {
                return new Model('mail.channel')
                        .call('name_search', ['', [['public','=','public']]], { context: webEditorContext.get() });
            },
        }).then(function (mail_channel_id) {
            self.$target.attr("data-id", mail_channel_id);
        });
    },
    drop_and_build_snippet: function() {
        var self = this;
        this._super();
        this.select_mailing_list("click").fail(function () {
            self.editor.on_remove();
        });
    },
    clean_for_save: function () {
        this.$target.addClass("hidden");
    },
});

});
