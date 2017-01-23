odoo.define("website.planner.instance", function (require) {
    "use strict";

    var ajax = require('web.ajax');
    var core = require('web.core');
    var session = require('web.session');
    var WebsitePlannerLauncher = require("website.planner");
    var WebsiteNavbar = require('website.navbar');

    var qweb = core.qweb;

    if (session.is_system) {
        WebsiteNavbar.include({
            start: function () {
                var websitePlannerLauncher = new WebsitePlannerLauncher(this);
                var def = ajax.loadXML('/web_planner/static/src/xml/web_planner.xml', qweb).then((function() {
                    return websitePlannerLauncher.prependTo(this.$(".o_menu_systray"));
                }).bind(this));
                return $.when(this._super.apply(this, arguments), def);
            },
        });
    }
});

odoo.define('website.planner', function (require) {
    "use strict";

    var Model = require('web.Model');
    var planner = require('web.planner.common');

    return planner.PlannerLauncher.extend({
        _fetch_planner_data: function () {
            return (new Model('web.planner')).call('search_read', [[['planner_application', '=', 'planner_website']]]).then((function (planner) {
                if (!planner.length) return;

                planner[0].data = $.parseJSON(planner[0].data) || {};
                this._setup_for_planner(planner[0]);
            }).bind(this));
        },
    });
});
