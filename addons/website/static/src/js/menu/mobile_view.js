odoo.define("website.mobile.instance", function (require) {
    "use strict";

    var core = require("web.core");
    var MobilePreviewDialog = require("website.mobile");
    var WebsiteNavbar = require('website.navbar');

    var _t = core._t;

    WebsiteNavbar.include({
        events: _.extend(WebsiteNavbar.prototype.events || {}, {
            "click a[data-action=show-mobile-preview]": function () {
                new MobilePreviewDialog(this, {
                    title: _t('Mobile preview') + " <span class='fa fa-refresh'/>",
                }).open();
            }
        }),
    });
});

odoo.define("website.mobile", function (require) {
    "use strict";

    var Dialog = require("web.Dialog");

    return Dialog.extend({
        template: "website.mobile_preview",

        init: function () {
            this._super.apply(this, arguments);
            this.mobile_src = $.param.querystring(window.location.href, 'mobilepreview');
        },

        start: function () {
            var self = this;
            this.$modal.addClass('oe_mobile_preview');
            this.$modal.on('click', '.modal-header', function () {
                self.$el.toggleClass('o_invert_orientation');
            });
            this.$iframe = this.$('iframe');
            this.$iframe.on('load', function (e) {
                self.$iframe.contents().find('body').removeClass('o_connected_user');
                self.$iframe.contents().find('#oe_main_menu_navbar').remove();
            });

            return this._super.apply(this, arguments);
        },
    });
});
