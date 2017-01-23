odoo.define("website.snippets.editor", function (require) {
    "use strict";

    var editor = require('web_editor.editor');
    var snippet_editor = require('web_editor.snippet.editor');
    var s_animations_start = require("website.content.snippets.animation.start");

    snippet_editor.Class.include({
        custom_events: _.extend({}, snippet_editor.Class.prototype.custom_events || {}, {
            snippet_dropped: function (e) {
                s_animations_start(true, e.data.$target);
            },
        }),
        _get_snippet_url: function () {
            return '/website/snippets';
        },
    });

    /**
     * Add the ability the restart the animations
     */
    editor.Class.include({
        start: function () {
            return this._super.apply(this, arguments).then(function () {
                s_animations_start(true);
            });
        },
    });
});
