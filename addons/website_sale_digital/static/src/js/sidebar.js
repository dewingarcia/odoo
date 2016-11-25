odoo.define('web.sidebar.digital', function (require) {
"use strict";

var Sidebar = require('web.Sidebar');

Sidebar.include({
    get_attachement_domain: function() {
        var dom = this._super();
        dom.push(['product_downloadable', '=', false]);
        return dom;
    }
});

});
