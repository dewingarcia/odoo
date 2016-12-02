odoo.define('web.Action', function(require) {
"use strict";

var Widget = require('web.Widget');

var Action = Widget.extend({
    template: 'Action',
    config: {
        MainWidget: null,
    },
    init: function(parent, options) {
        this.withControlPanel = options.withControlPanel;
        this.currentBreadcrumbs = options.currentBreadcrumbs;
        // this.currentTitle = ...
        // this.setupControlPanel()
    },
});

return Action;

});

