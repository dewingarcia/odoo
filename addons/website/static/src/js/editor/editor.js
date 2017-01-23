odoo.define("website.welcome_message", function (require) {
    "use strict";

    var ajax = require('web.ajax');
    var core = require("web.core");
    var base = require("web_editor.base");

    var qweb = core.qweb;

    ajax.loadXML('/website/static/src/xml/website.editor.xml', qweb);

    // Display a welcome message on the homepage when it is empty and that the user is connected.
    base.ready().then(function () {
        if (window.location.search.indexOf("enable_editor") < 0 && $(".editor_enable").length === 0) {
            var $wrap = $("#wrapwrap.homepage #wrap");
            if ($wrap.length && $wrap.html().trim() === "") {
                var $welcome_message = $(qweb.render("website.homepage_editor_welcome_message"));
                $welcome_message.css("min-height", $wrap.parent("main").height() - ($wrap.outerHeight(true) - $wrap.height()));
                $wrap.empty().append($welcome_message);

                $(document).one("edit_mode_started", function () {
                    $welcome_message.remove();
                });
            }
        }
    });
});

odoo.define("website.editor.instance", function (require) {
    "use strict";

    var websiteNavbar = require("website.navbar.instance");
    var editorBar = require("web_editor.editor.instance");

    if (editorBar !== null) {
        editorBar.setParent(websiteNavbar);
    }
});

odoo.define("website.editor", function (require) {
    'use strict';

    var ajax = require('web.ajax');
    var core = require('web.core');
    var webEditorContext = require("web_editor.context");
    var editor = require('web_editor.editor');
    var widget = require('web_editor.widget');
    var WebsiteNavbar = require('website.navbar');

    var qweb = core.qweb;

    ajax.loadXML('/website/static/src/xml/website.editor.xml', qweb);

    // Add the behavior when clicking on the "edit" button (+ editor interaction)
    WebsiteNavbar.include({
        events: {
            'click [data-action="edit"]': 'edit',
        },
        start: function () {
            $("#wrapwrap").find("[data-oe-model] .oe_structure.oe_empty, [data-oe-model].oe_structure.oe_empty, [data-oe-type=html]:empty")
                .filter(".oe_not_editable")
                .filter(".oe_no_empty")
                .addClass("oe_empty");

            if (window.location.search.indexOf("enable_editor") >= 0 && $('html').attr('lang').match(/en[-_]US/)) {
                this.$el.addClass('editing_mode');
                this._doDelayedHide();
            }

            return this._super.apply(this, arguments);
        },
        edit: function () {
            this.$('button[data-action=edit]').prop('disabled', true);
            this.$el.addClass('editing_mode');
            editor.editor_bar = new editor.Class(this);
            editor.editor_bar.prependTo(document.body);
            this.$el.trigger("edit_mode_started");

            this._doDelayedHide();
        },
        _doDelayedHide: function () {
            _.delay((function () {
                this.do_hide();
            }).bind(this), 800);
        },
    });

    // Adapt link dialog to propose website pages
    widget.LinkDialog.include({
        bind_data: function () {
            this.$( "#link-external" ).autocomplete({
                source: function (request, response) {
                    return ajax.jsonRpc('/web/dataset/call_kw', 'call', {
                        model: 'website',
                        method: 'search_pages',
                        args: [null, request.term],
                        kwargs: {
                                limit: 15,
                                context: webEditorContext.get(),
                            },
                    }).then(function (exists) {
                        var rs=_.map(exists, function (r) {
                            return r.loc;
                        });
                        response(rs);
                    });
                }
            });
            return this._super();
        }
    });
});
