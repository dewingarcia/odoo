odoo.define("website.navbar.instance", function (require) {
    "use strict";

    var ajax = require('web.ajax');
    var core = require('web.core');
    var base = require("web_editor.base");
    var Navbar = require("website.navbar");

    var qweb = core.qweb;

    ajax.loadXML('/web/static/src/xml/base_common.xml', qweb); // FIXME check all of these
    ajax.loadXML('/website/static/src/xml/website.xml', qweb);

    return base.ready().then(function () {
        var navbar = new Navbar(null);
        return navbar.attachTo($("#oe_main_menu_navbar")).then(function () {
            return navbar;
        });
    });
});

odoo.define("website.navbar", function (require) {
    "use strict";

    var Widget = require('web.Widget');

    return Widget.extend({
        start: function () {
            var $collapse = this.$('#oe_applications ul.dropdown-menu').clone()
                    .attr("id", "oe_applications_collapse")
                    .attr("class", "nav navbar-nav navbar-left navbar-collapse collapse");
            this.$('#oe_applications').before($collapse);
            $collapse.wrap('<div class="visible-xs"/>');
            this.$('[data-target="#oe_applications"]').attr("data-target", "#oe_applications_collapse");

            var self = this;
            this.$el.on('mouseover', '> ul > li.dropdown:not(.open)', function (e) {
                var $opened = self.$('> ul > li.dropdown.open');
                if($opened.length) {
                    $opened.removeClass('open');
                    $(e.currentTarget).find('.dropdown-toggle').mousedown().focus().mouseup().click();
                }
            });

            this.$el.on('click', '.o_mobile_menu_toggle', function (ev) {
                self.$el.parent().toggleClass('o_mobile_menu_opened');
            });

            return this._super.apply(this, arguments);
        }
    });
});
