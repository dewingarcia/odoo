odoo.define('website_event.editor', function (require) {
"use strict";

var core = require('web.core');
var wUtils = require('website.utils');
var WebsiteNewMenu = require("website.newMenu");

var _t = core._t;

WebsiteNewMenu.include({
    new_event: function() {
        wUtils.prompt({
            id: "editor_new_event",
            window_title: _t("New Event"),
            input: "Event Name",
        }).then(function (event_name) {
            wUtils.form('/event/add_event', 'POST', {
                event_name: event_name
            });
        });
    },
});
});
