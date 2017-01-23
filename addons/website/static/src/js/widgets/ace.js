odoo.define("website.ace.instance", function (require) {
    "use strict";

    var Ace = require("website.ace");
    var WebsiteNavbar = require("website.navbar");

    WebsiteNavbar.include({
        start: function () {
            this.ace = new Ace();
            return $.when(
                this._super.apply(this, arguments),
                this.ace.attachTo(this.$("#html_editor"))
            );
        },
    });
});

odoo.define("website.ace", function (require) {
    "use strict";

    var Widget = require("web.Widget");

    var ViewEditor = require("web_editor.ace");

    var hash = "#advanced-view-editor";

    // Extend the default view editor so that the URL hash is updated with view id
    ViewEditor = ViewEditor.extend({
        displayResource: function () {
            this._super.apply(this, arguments);
            this._updateHash();
        },
        saveResources: function () {
            return this._super.apply(this, arguments).then((function () {
                this._updateHash();
                window.location.reload();
            }).bind(this));
        },
        resetResource: function () {
            return this._super.apply(this, arguments).then((function () {
                window.location.reload();
            }).bind(this));
        },
        do_hide: function () {
            this._super.apply(this, arguments);
            window.location.hash = "";
        },
        _updateHash: function () {
            window.location.hash = hash + "?res=" + this.selectedResource();
        },
    });

    return Widget.extend({
        events: {
            "click a[data-action=ace]": function (e) {
                e.preventDefault();
                this.launchAce();
            },
        },
        start: function () {
            if (window.location.hash.substr(0, hash.length) === hash) {
                this.launchAce();
            }
            return this._super.apply(this, arguments);
        },
        launchAce: function () {
            if (this.globalEditor) {
                this.globalEditor.do_show();
            } else {
                var currentHash = window.location.hash;
                var indexOfView = currentHash.indexOf("?res=");
                var initialResID = undefined;
                if (indexOfView >= 0) {
                    initialResID = currentHash.substr(indexOfView + ("?res=".length));
                    var parsedResID = parseInt(initialResID, 10);
                    if (parsedResID) {
                        initialResID = parsedResID;
                    }
                }

                this.globalEditor = new ViewEditor(this, $(document.documentElement).data('view-xmlid'), {
                    initialResID: initialResID,
                    defaultBundlesRestriction: [
                        "web.assets_frontend",
                        "website.assets_frontend",
                    ],
                });
                this.globalEditor.appendTo(document.body);

                $("a[data-action=edit]").on("click", this.globalEditor.do_hide.bind(this.globalEditor));
            }
        },
    });
});
