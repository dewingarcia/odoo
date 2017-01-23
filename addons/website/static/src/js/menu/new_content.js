odoo.define("website.newMenu.instance", function (require) {
    "use strict";

    var NewMenu = require("website.newMenu");
    var WebsiteNavbar = require("website.navbar");

    WebsiteNavbar.include({
        start: function () {
            this.newMenu = new NewMenu(this);
            return $.when(
                this._super.apply(this, arguments),
                this.newMenu.attachTo(this.$(".o_new_content_menu"))
            );
        }
    });
});

odoo.define("website.newMenu", function (require) {
    "use strict";

    var core = require("web.core");
    var Widget = require("web.Widget");
    var wUtils = require("website.utils");

    var qweb = core.qweb;
    var _t = core._t;

    return Widget.extend({
        events: {
            "click > a": function (e) {
                e.preventDefault();
                this._toggleChoices();
            },
            "click a[data-action]": function (e) {
                e.preventDefault();
                this[$(e.currentTarget).data('action')].call(this);
            },
        },
        start: function () {
            this.$newContentMenuChoices = this.$("#o_new_content_menu_choices");
            return this._super.apply(this, arguments);
        },
        _toggleChoices: function () {
            this.$newContentMenuChoices.toggleClass("o_hidden");
        },
        new_page: function () {
            wUtils.prompt({
                id: "editor_new_page",
                window_title: _t("New Page"),
                input: _t("Page Title"),
                init: function () {
                    var $group = this.$dialog.find("div.form-group");
                    $group.removeClass("mb0");

                    var $add = $('<div/>', {'class': 'form-group mb0'})
                                .append($('<span/>', {'class': 'col-sm-offset-3 col-sm-9 text-left'})
                                        .append(qweb.render('web_editor.components.switch', {id: 'switch_addTo_menu', label: _t("Add page in menu")})));
                    $add.find('input').prop('checked', true);
                    $group.after($add);
                }
            }).then(function (val, field, $dialog) {
                if (val) {
                    var url = '/website/add/' + encodeURIComponent(val);
                    if ($dialog.find('input[type="checkbox"]').is(':checked')) url +="?add_menu=1";
                    document.location = url;
                }
            });
        },
    });
});
