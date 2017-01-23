odoo.define("website.customizeMenu.instance", function (require) {
    "use strict";

    var WebsiteNavbar = require("website.navbar");
    var CustomizeMenu = require("website.customizeMenu");

    WebsiteNavbar.include({
        start: function () {
            this.customizeMenu = new CustomizeMenu(this);
            return $.when(
                this._super.apply(this, arguments),
                this.customizeMenu.attachTo(this.$("#customize-menu"))
            );
        }
    });
});

odoo.define('website.customizeMenu', function (require) {
    "use strict";

    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');
    var webEditorContext = require("web_editor.context");

    var qweb = core.qweb;

    return Widget.extend({
        events: {
            'click > ul a[data-view-id]': 'do_customize',
        },
        start: function () {
            this.view_name = $(document.documentElement).data('view-xmlid');
            if (!this.view_name) {
                this.$el.hide();
            }

            if (this.$el.is(".open")) {
                this.load_menu();
            } else {
                this.$el.one("mousedown", "> a.dropdown-toggle", this.load_menu.bind(this));
            }
        },
        load_menu: function () {
            var $menu = this.$el.children("ul");
            ajax.jsonRpc('/website/get_switchable_related_views', 'call', {
                key: this.view_name,
            }).then(function (result) {
                var current_group = "";
                _.each(result, function (item) {
                    if (current_group !== item.inherit_id[1]) {
                        current_group = item.inherit_id[1];
                        $menu.append("<li class=\"dropdown-header\">" + current_group + "</li>");
                    }
                    var $li = $('<li/>', {role: 'presentation'})
                                .append($('<a/>', {href: '#', 'data-view-id': item.id, role: 'menuitem'})
                                    .append(qweb.render('web_editor.components.switch', {id: 'switch-' + item.id, label: item.name})));
                    $li.find('input').prop('checked', !!item.active);
                    $menu.append($li);
                });
            });
        },
        do_customize: function (e) {
            e.preventDefault();
            var view_id = $(e.currentTarget).data('view-id');
            return ajax.jsonRpc('/web/dataset/call_kw', 'call', {
                model: 'ir.ui.view',
                method: 'toggle',
                args: [[parseInt(view_id, 10)]],
                kwargs: {context: webEditorContext.get()}
            }).then(function () {
                window.location.reload();
            });
        },
    });
});
